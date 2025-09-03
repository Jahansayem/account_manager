'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { oneSignalService } from '@/lib/onesignal'
import { AccountType, AccountStatus } from '@/lib/types/enums'
import { PlatformEntity } from '@/lib/types/entities'
import { ArrowLeft, Mail, DollarSign, Calendar, Users, FileText } from 'lucide-react'
import Link from 'next/link'

export default function CreateAccountPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [platforms, setPlatforms] = useState<PlatformEntity[]>([])
  const [formData, setFormData] = useState({
    email: '',
    platformId: '',
    accountType: AccountType.PRIVATE,
    maxCustomers: 1,
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    totalAmount: 0,
    currency: 'BDT',
    status: AccountStatus.ACTIVE,
    loginInstructions: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      const platformsData = data.map(platform => ({
        id: platform.id,
        name: platform.name,
        description: platform.description,
        iconType: platform.icon_type,
        iconValue: platform.icon_data,
        color: platform.color_hex,
        category: platform.category,
        isActive: platform.is_active,
        createdAt: new Date(platform.created_at),
        updatedAt: new Date(platform.updated_at),
      })) as PlatformEntity[]

      setPlatforms(platformsData)
    } catch (error) {
      console.error('Error fetching platforms:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.platformId) {
      newErrors.platformId = 'Platform is required'
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required'
    } else if (new Date(formData.expiryDate) <= new Date(formData.purchaseDate)) {
      newErrors.expiryDate = 'Expiry date must be after purchase date'
    }

    if (formData.totalAmount <= 0) {
      newErrors.totalAmount = 'Amount must be greater than 0'
    }

    if (formData.maxCustomers <= 0) {
      newErrors.maxCustomers = 'Max customers must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user) return

    setLoading(true)
    try {
      // Check for duplicate account first (same email + user_id combination)
      const { data: existingAccounts, error: checkError } = await supabase
        .from('accounts')
        .select('id, email')
        .eq('email', formData.email.trim().toLowerCase())
        .eq('user_id', user.id)
        .limit(1)

      if (checkError) throw checkError

      if (existingAccounts && existingAccounts.length > 0) {
        setErrors({ 
          submit: 'An account with this email already exists. Please use a different email or edit the existing account.' 
        })
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('accounts')
        .insert({
          email: formData.email.trim().toLowerCase(),
          platform_id: formData.platformId || null,
          account_type: formData.accountType,
          max_customers: formData.maxCustomers,
          purchase_date: formData.purchaseDate,
          expiry_date: formData.expiryDate,
          total_amount: formData.totalAmount,
          currency: formData.currency,
          status: formData.status,
          login_instructions: formData.loginInstructions || null,
          notes: formData.notes || null,
          user_id: user.id,
        })

      if (error) throw error

      // Send notification about new account
      try {
        const selectedPlatform = platforms.find(p => p.id === formData.platformId)
        if (selectedPlatform) {
          await oneSignalService.notifyNewAccountCreated(formData.email, selectedPlatform.name)
        }
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError)
      }

      router.push('/accounts')
    } catch (error) {
      console.error('Error creating account:', error)
      
      // More specific error handling
      let errorMessage = 'Failed to create account. Please try again.'
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          const message = error.message as string
          // Handle duplicate key constraint specifically
          if (message.includes('duplicate key value violates unique constraint "accounts_email_user_id_key"')) {
            errorMessage = 'An account with this email already exists. Please use a different email or edit the existing account.'
          } else if (message.includes('duplicate key')) {
            errorMessage = 'This account already exists. Please check your input and try again.'
          } else {
            errorMessage = `Database error: ${message}`
          }
        } else if ('code' in error) {
          const code = error.code as string
          if (code === '23505') { // PostgreSQL unique violation error code
            errorMessage = 'An account with this email already exists. Please use a different email or edit the existing account.'
          } else {
            errorMessage = `Error code: ${code}`
          }
        }
      }
      
      setErrors({ submit: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/accounts">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Accounts
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Create New Account</h1>
            <p className="text-gray-600 mt-2">Add a new subscription account to manage customers and track revenue.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Account Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter account email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>

                {/* Platform */}
                <div className="space-y-2">
                  <Label htmlFor="platformId">Platform *</Label>
                  <select
                    id="platformId"
                    value={formData.platformId}
                    onChange={(e) => handleInputChange('platformId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select a platform</option>
                    {platforms.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                  {errors.platformId && <p className="text-sm text-red-600">{errors.platformId}</p>}
                </div>

                {/* Account Type and Max Customers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <select
                      id="accountType"
                      value={formData.accountType}
                      onChange={(e) => handleInputChange('accountType', e.target.value as AccountType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={AccountType.PRIVATE}>Private</option>
                      <option value={AccountType.SHARED}>Shared</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxCustomers">Max Customers *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="maxCustomers"
                        type="number"
                        min="1"
                        placeholder="Enter max customers"
                        value={formData.maxCustomers}
                        onChange={(e) => handleInputChange('maxCustomers', parseInt(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    {errors.maxCustomers && <p className="text-sm text-red-600">{errors.maxCustomers}</p>}
                  </div>
                </div>

                {/* Purchase and Expiry Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="expiryDate"
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.expiryDate && <p className="text-sm text-red-600">{errors.expiryDate}</p>}
                  </div>
                </div>

                {/* Amount and Currency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter amount"
                        value={formData.totalAmount}
                        onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    {errors.totalAmount && <p className="text-sm text-red-600">{errors.totalAmount}</p>}
                  </div>


                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as AccountStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={AccountStatus.ACTIVE}>Active</option>
                    <option value={AccountStatus.INACTIVE}>Inactive</option>
                    <option value={AccountStatus.SUSPENDED}>Suspended</option>
                    <option value={AccountStatus.ARCHIVED}>Archived</option>
                  </select>
                </div>

                {/* Login Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="loginInstructions">Login Instructions</Label>
                  <Textarea
                    id="loginInstructions"
                    placeholder="Enter login instructions (optional)"
                    value={formData.loginInstructions}
                    onChange={(e) => handleInputChange('loginInstructions', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="notes"
                      placeholder="Add any additional notes (optional)"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="pl-9"
                      rows={3}
                    />
                  </div>
                </div>

                {errors.submit && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {errors.submit}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Link href="/accounts">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}