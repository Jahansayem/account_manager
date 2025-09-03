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
import { oneSignalService } from '@/lib/onesignal'
import { AccountEntity } from '@/lib/types/entities'
import { RenewalStatus } from '@/lib/types/enums'
import { ArrowLeft, User, Mail, Phone, Calendar, DollarSign, Clock, FileText } from 'lucide-react'
import Link from 'next/link'

export default function CreateCustomerPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [availableSlots, setAvailableSlots] = useState<number[]>([])
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    durationDays: 30,
    amountPaid: 0,
    // Use DB-aligned status values
    paymentStatus: 'paid' as 'paid' | 'due' | 'partial',
    notes: '',
    slotNumber: 1,
    renewalStatus: RenewalStatus.PENDING,
    renewalReminderSent: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (accountId) {
      fetchAccount()
      fetchAvailableSlots()
    }
  }, [accountId])

  useEffect(() => {
    if (formData.purchaseDate && formData.durationDays) {
      // Auto-calculate expiry date when needed (handled in form submission)
    }
  }, [formData.purchaseDate, formData.durationDays])

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
        id: (data as any).id,
        email: (data as any).email,
        accountType: (data as any).account_type,
        maxCustomers: (data as any).max_customers,
        purchaseDate: new Date((data as any).purchase_date),
        expiryDate: new Date((data as any).expiry_date),
        totalAmount: (data as any).total_amount,
        status: (data as any).status,
        loginInstructions: (data as any).login_instructions,
        notes: (data as any).notes,
        createdAt: new Date((data as any).created_at),
        updatedAt: new Date((data as any).updated_at),
        platform: (data as any).platforms ? {
          id: (data as any).platforms.id,
          name: (data as any).platforms.name,
          description: (data as any).platforms.description,
          iconType: (data as any).platforms.icon_type,
          iconValue: (data as any).platforms.icon_value,
          color: (data as any).platforms.color,
          category: (data as any).platforms.category,
          isActive: (data as any).platforms.is_active,
        } : undefined,
      }

      setAccount(accountData)
    } catch (error) {
      console.error('Error fetching account:', error)
      router.push('/accounts')
    } finally {
      setPageLoading(false)
    }
  }

  const fetchAvailableSlots = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('slot_number')
        .eq('account_id', accountId)

      if (error) throw error

      const usedSlots = (customers as any[]).map(c => c.slot_number)
      const maxSlots = account?.maxCustomers || 10 // fallback
      const available: number[] = []
      
      for (let i = 1; i <= maxSlots; i++) {
        if (!usedSlots.includes(i)) {
          available.push(i)
        }
      }

      setAvailableSlots(available)
      if (available.length > 0) {
        setFormData(prev => ({ ...prev, slotNumber: available[0] }))
      }
    } catch (error) {
      console.error('Error fetching available slots:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    if (formData.customerEmail && !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email is invalid'
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required'
    }

    if (formData.durationDays <= 0) {
      newErrors.durationDays = 'Duration must be greater than 0'
    }

    if (formData.amountPaid < 0) {
      newErrors.amountPaid = 'Amount cannot be negative'
    }

    if (!availableSlots.includes(formData.slotNumber)) {
      newErrors.slotNumber = 'Selected slot is not available'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user) return

    setLoading(true)
    try {
      const purchaseDate = new Date(formData.purchaseDate)
      const expiryDate = new Date(purchaseDate.getTime() + formData.durationDays * 24 * 60 * 60 * 1000)

      const { error } = await (supabase as any)
        .from('customers')
        .insert({
          account_id: accountId,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail || null,
          customer_phone: formData.customerPhone || null,
          purchase_date: formData.purchaseDate,
          duration_days: formData.durationDays,
          expiry_date: expiryDate.toISOString().split('T')[0],
          amount_paid: formData.amountPaid,
          // Ensure valid enum for DB
          payment_status: formData.paymentStatus,
          notes: formData.notes || null,
          slot_number: formData.slotNumber,
          renewal_status: formData.renewalStatus,
          renewal_reminder_sent: formData.renewalReminderSent,
        })

      if (error) throw error

      // Send notification about new customer
      try {
        const platformName = account?.platform?.name || 'Unknown Platform'
        await oneSignalService.notifyNewCustomerAdded(formData.customerName, platformName)
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError)
      }

      router.push(`/accounts/${accountId}/customers`)
    } catch (error: unknown) {
      const message = (error as Error)?.message || (typeof error === 'string' ? error : JSON.stringify(error))
      console.error('Error creating customer:', message)
      setErrors({ submit: 'Failed to create customer. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (pageLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!account) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Account not found</p>
            <Link href="/accounts">
              <Button className="mt-4">Back to Accounts</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (availableSlots.length === 0) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">No available slots in this account</p>
            <p className="text-sm text-gray-400 mt-2">
              This account has reached its maximum capacity of {account.maxCustomers} customers.
            </p>
            <Link href={`/accounts/${accountId}/customers`}>
              <Button className="mt-4">Back to Customers</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href={`/accounts/${accountId}/customers`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Customers
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Add New Customer</h1>
            <p className="text-gray-600 mt-2">
              Add a customer to {account.platform?.name || 'Unknown Platform'} - {account.email}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Name */}
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="customerName"
                      type="text"
                      placeholder="Enter customer name"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {errors.customerName && <p className="text-sm text-red-600">{errors.customerName}</p>}
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="Enter customer email (optional)"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.customerEmail && <p className="text-sm text-red-600">{errors.customerEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="customerPhone"
                        type="tel"
                        placeholder="Enter customer phone (optional)"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Purchase Date and Duration */}
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
                    {errors.purchaseDate && <p className="text-sm text-red-600">{errors.purchaseDate}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="durationDays">Duration (Days) *</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="durationDays"
                        type="number"
                        min="1"
                        placeholder="Enter duration in days"
                        value={formData.durationDays}
                        onChange={(e) => handleInputChange('durationDays', parseInt(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    {errors.durationDays && <p className="text-sm text-red-600">{errors.durationDays}</p>}
                  </div>
                </div>

                {/* Amount and Payment Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="amountPaid">Amount Paid</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="amountPaid"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter amount paid"
                        value={formData.amountPaid}
                        onChange={(e) => handleInputChange('amountPaid', parseFloat(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    {errors.amountPaid && <p className="text-sm text-red-600">{errors.amountPaid}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <select
                      id="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="paid">Paid</option>
                      <option value="due">Due</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                </div>

                {/* Slot Number and Renewal Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="slotNumber">Slot Number</Label>
                    <select
                      id="slotNumber"
                      value={formData.slotNumber}
                      onChange={(e) => handleInputChange('slotNumber', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          Slot {slot}
                        </option>
                      ))}
                    </select>
                    {errors.slotNumber && <p className="text-sm text-red-600">{errors.slotNumber}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renewalStatus">Renewal Status</Label>
                    <select
                      id="renewalStatus"
                      value={formData.renewalStatus}
                      onChange={(e) => handleInputChange('renewalStatus', e.target.value as RenewalStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={RenewalStatus.PENDING}>Pending</option>
                      <option value={RenewalStatus.RENEWED}>Renewed</option>
                      <option value={RenewalStatus.NOT_RENEWED}>Not Renewed</option>
                    </select>
                  </div>
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
                  <Link href={`/accounts/${accountId}/customers`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Customer'}
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
