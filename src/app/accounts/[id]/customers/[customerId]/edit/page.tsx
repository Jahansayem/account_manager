'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { CustomerEntity, AccountEntity } from '@/lib/types/entities'
import { PaymentStatus, AccountType, AccountStatus, IconType, RenewalStatus } from '@/lib/types/enums'
import { ArrowLeft, User, DollarSign, Calendar, FileText, Mail, Phone } from 'lucide-react'
import Link from 'next/link'

export default function EditCustomerPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const customerId = params.customerId as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [customer, setCustomer] = useState<CustomerEntity | null>(null)
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    amountPaid: 0,
    paymentStatus: PaymentStatus.DUE,
    notes: '',
    purchaseDate: '',
    expiryDate: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchAccountAndCustomer = useCallback(async () => {
    if (!user) return

    try {
      // Fetch account
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select(`
          *,
          platforms (*)
        `)
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (accountError) throw accountError
      if (!accountData) throw new Error('Account not found')

      // Type assertion for database response
      interface DatabaseAccount {
        id: string;
        email: string;
        account_type: string;
        max_customers: number;
        purchase_date: string;
        expiry_date: string;
        total_amount: number;
        currency: string;
        status: string;
        login_instructions?: string;
        notes?: string;
        created_at: string;
        updated_at: string;
        platforms?: {
          id: string;
          name: string;
          description?: string;
          icon_type: string;
          icon_value?: string;
          color: string;
          category?: string;
          is_active: boolean;
        };
      }

      const dbAccount = accountData as DatabaseAccount;
      const account: AccountEntity = {
        id: dbAccount.id,
        email: dbAccount.email,
        accountType: dbAccount.account_type as AccountType,
        maxCustomers: dbAccount.max_customers,
        purchaseDate: new Date(dbAccount.purchase_date),
        expiryDate: new Date(dbAccount.expiry_date),
        totalAmount: dbAccount.total_amount,
        currency: dbAccount.currency,
        status: dbAccount.status as AccountStatus,
        loginInstructions: dbAccount.login_instructions,
        notes: dbAccount.notes,
        createdAt: new Date(dbAccount.created_at),
        updatedAt: new Date(dbAccount.updated_at),
        platform: dbAccount.platforms ? {
          id: dbAccount.platforms.id,
          name: dbAccount.platforms.name,
          description: dbAccount.platforms.description,
          iconType: dbAccount.platforms.icon_type as IconType,
          iconValue: dbAccount.platforms.icon_value || '',
          color: dbAccount.platforms.color,
          category: dbAccount.platforms.category,
          isActive: dbAccount.platforms.is_active,
        } : undefined,
      }

      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('account_id', accountId)
        .single()

      if (customerError) throw customerError
      if (!customerData) throw new Error('Customer not found')

      // Type assertion for customer database response
      interface DatabaseCustomer {
        id: string;
        account_id: string;
        customer_name: string;
        customer_email?: string;
        customer_phone?: string;
        amount_paid: number;
        currency: string;
        payment_status: string;
        notes?: string;
        purchase_date: string;
        expiry_date: string;
        duration_days: number;
        slot_number: number;
        renewal_status: string;
        renewal_reminder_sent: boolean;
        created_at: string;
        updated_at: string;
      }

      const dbCustomer = customerData as DatabaseCustomer;
      const customer: CustomerEntity = {
        id: dbCustomer.id,
        accountId: dbCustomer.account_id,
        customerName: dbCustomer.customer_name,
        customerEmail: dbCustomer.customer_email,
        customerPhone: dbCustomer.customer_phone,
        amountPaid: dbCustomer.amount_paid,
        paymentStatus: dbCustomer.payment_status as PaymentStatus,
        notes: dbCustomer.notes,
        purchaseDate: new Date(dbCustomer.purchase_date),
        expiryDate: new Date(dbCustomer.expiry_date),
        durationDays: dbCustomer.duration_days,
        slotNumber: dbCustomer.slot_number,
        renewalStatus: dbCustomer.renewal_status as RenewalStatus,
        renewalReminderSent: dbCustomer.renewal_reminder_sent,
        createdAt: new Date(dbCustomer.created_at),
        updatedAt: new Date(dbCustomer.updated_at),
      }

      setAccount(account)
      setCustomer(customer)
      setFormData({
        customerName: customer.customerName,
        customerEmail: customer.customerEmail || '',
        customerPhone: customer.customerPhone || '',
        amountPaid: customer.amountPaid,
        paymentStatus: customer.paymentStatus,
        notes: customer.notes || '',
        purchaseDate: customer.purchaseDate.toISOString().split('T')[0],
        expiryDate: customer.expiryDate.toISOString().split('T')[0],
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      router.push(`/accounts/${accountId}/customers`)
    } finally {
      setLoading(false)
    }
  }, [user, accountId, customerId, router])

  useEffect(() => {
    if (accountId && customerId) {
      fetchAccountAndCustomer()
    }
  }, [accountId, customerId, fetchAccountAndCustomer])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    if (formData.customerEmail && !/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email is invalid'
    }

    if (formData.amountPaid < 0) {
      newErrors.amountPaid = 'Amount cannot be negative'
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required'
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required'
    } else if (new Date(formData.expiryDate) <= new Date(formData.purchaseDate)) {
      newErrors.expiryDate = 'Expiry date must be after purchase date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user || !customer) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          customer_name: formData.customerName,
          customer_email: formData.customerEmail || null,
          customer_phone: formData.customerPhone || null,
          amount_paid: formData.amountPaid,
          payment_status: formData.paymentStatus,
          notes: formData.notes || null,
          purchase_date: formData.purchaseDate,
          expiry_date: formData.expiryDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)

      if (error) throw error

      router.push(`/accounts/${accountId}/customers`)
    } catch (error) {
      console.error('Error updating customer:', error)
      setErrors({ submit: 'Failed to update customer. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!account || !customer) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Customer not found</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
            <p className="text-gray-600 mt-2">
              Edit customer for {account.platform?.name || 'Unknown Platform'} - {account.email}
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
                    <Label htmlFor="customerEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="Enter email (optional)"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.customerEmail && <p className="text-sm text-red-600">{errors.customerEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="customerPhone"
                        type="tel"
                        placeholder="Enter phone (optional)"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount and Currency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="amountPaid">Amount Paid *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="amountPaid"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter amount"
                        value={formData.amountPaid}
                        onChange={(e) => handleInputChange('amountPaid', parseFloat(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    {errors.amountPaid && <p className="text-sm text-red-600">{errors.amountPaid}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="BDT">BDT (৳)</option>
                    </select>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <select
                    id="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={(e) => handleInputChange('paymentStatus', e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={PaymentStatus.DUE}>Due</option>
                    <option value={PaymentStatus.PARTIAL}>Partial</option>
                    <option value={PaymentStatus.PAID}>Paid</option>
                  </select>
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
                    {errors.purchaseDate && <p className="text-sm text-red-600">{errors.purchaseDate}</p>}
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
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
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