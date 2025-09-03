'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { AccountEntity } from '@/lib/types/entities'
import { RecordType } from '@/lib/types/enums'
import { ArrowLeft, DollarSign, Calendar, FileText, Tag } from 'lucide-react'
import Link from 'next/link'

export default function CreateFinancialRecordPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const [loading, setLoading] = useState(false)
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    recordType: RecordType.INCOME,
    category: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (accountId) {
      fetchAccount()
    }
  }, [accountId])

  const fetchAccount = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          platforms (*)
        `)
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      if (!data) throw new Error('No account data found')

      const accountData: AccountEntity = {
        id: data.id,
        email: data.email,
        accountType: data.account_type,
        maxCustomers: data.max_customers,
        purchaseDate: new Date(data.purchase_date),
        expiryDate: new Date(data.expiry_date),
        totalAmount: data.total_amount,
        status: data.status,
        loginInstructions: data.login_instructions,
        notes: data.notes,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        platform: data.platforms ? {
          id: data.platforms.id,
          name: data.platforms.name,
          description: data.platforms.description,
          iconType: data.platforms.icon_type,
          iconValue: data.platforms.icon_value,
          color: data.platforms.color,
          category: data.platforms.category,
          isActive: data.platforms.is_active,
        } : undefined,
      }

      setAccount(accountData)
    } catch (error) {
      console.error('Error fetching account:', error)
      router.push('/accounts')
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('financial_records')
        .insert({
          account_id: accountId,
          description: formData.description,
          amount: formData.amount,
          record_type: formData.recordType,
          category: formData.category || null,
          notes: formData.notes || null,
          date: formData.date,
          user_id: user.id,
        })

      if (error) throw error

      router.push(`/accounts/${accountId}/financial`)
    } catch (error) {
      console.error('Error creating financial record:', error)
      setErrors({ submit: 'Failed to create financial record. Please try again.' })
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

  if (!account) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href={`/accounts/${accountId}/financial`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Financial Records
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Add Financial Record</h1>
            <p className="text-gray-600 mt-2">
              Add a new financial record for {account.platform?.name || 'Unknown Platform'} - {account.email}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Record Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="description"
                      type="text"
                      placeholder="Enter description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
                </div>

                {/* Record Type and Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="recordType">Type</Label>
                    <select
                      id="recordType"
                      value={formData.recordType}
                      onChange={(e) => handleInputChange('recordType', e.target.value as RecordType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={RecordType.INCOME}>Income</option>
                      <option value={RecordType.EXPENSE}>Expense</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter amount"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
                  </div>
                </div>

                {/* Category and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="category"
                        type="text"
                        placeholder="Enter category (optional)"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes (optional)"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>

                {errors.submit && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {errors.submit}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Link href={`/accounts/${accountId}/financial`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Record'}
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