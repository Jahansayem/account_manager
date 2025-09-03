'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { CustomerEntity, AccountEntity } from '@/lib/types/entities'
import { PaymentStatus, RenewalStatus } from '@/lib/types/enums'
import { ArrowLeft, Plus, Search, Mail, Phone, Calendar, User, MessageSquare, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function AccountCustomersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [customers, setCustomers] = useState<CustomerEntity[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerEntity[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<PaymentStatus | 'all'>('all')
  const [filterRenewalStatus, setFilterRenewalStatus] = useState<RenewalStatus | 'all'>('all')

  useEffect(() => {
    if (accountId) {
      fetchAccount()
      fetchCustomers()
    }
  }, [accountId])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchTerm, filterPaymentStatus, filterRenewalStatus])

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
      if (!data) throw new Error('Account not found')

      // Type assertion to fix TypeScript inference issue
      const accountRow = data as any

      const accountData: AccountEntity = {
        id: accountRow.id,
        email: accountRow.email,
        accountType: accountRow.account_type,
        maxCustomers: accountRow.max_customers,
        purchaseDate: new Date(accountRow.purchase_date),
        expiryDate: new Date(accountRow.expiry_date),
        totalAmount: accountRow.total_amount,
        status: accountRow.status,
        loginInstructions: accountRow.login_instructions,
        notes: accountRow.notes,
        createdAt: new Date(accountRow.created_at),
        updatedAt: new Date(accountRow.updated_at),
        platform: accountRow.platforms ? {
          id: accountRow.platforms.id,
          name: accountRow.platforms.name,
          description: accountRow.platforms.description,
          iconType: accountRow.platforms.icon_type,
          iconValue: accountRow.platforms.icon_value,
          color: accountRow.platforms.color,
          category: accountRow.platforms.category,
          isActive: accountRow.platforms.is_active,
        } : undefined,
      }

      setAccount(accountData)
    } catch (error) {
      console.error('Error fetching account:', error)
      router.push('/accounts')
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const customersData = data.map(customer => ({
        ...customer,
        accountId: customer.account_id,
        customerName: customer.customer_name,
        customerEmail: customer.customer_email,
        customerPhone: customer.customer_phone,
        purchaseDate: new Date(customer.purchase_date),
        durationDays: customer.duration_days,
        expiryDate: new Date(customer.expiry_date),
        amountPaid: customer.amount_paid,
        paymentStatus: customer.payment_status as PaymentStatus,
        slotNumber: customer.slot_number,
        renewalStatus: customer.renewal_status as RenewalStatus,
        renewalReminderSent: customer.renewal_reminder_sent,
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at),
      })) as CustomerEntity[]

      setCustomers(customersData)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerPhone?.includes(searchTerm)
      )
    }

    if (filterPaymentStatus !== 'all') {
      filtered = filtered.filter(customer => customer.paymentStatus === filterPaymentStatus)
    }

    if (filterRenewalStatus !== 'all') {
      filtered = filtered.filter(customer => customer.renewalStatus === filterRenewalStatus)
    }

    setFilteredCustomers(filtered)
  }

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <Badge variant="default" className="bg-green-500">Paid</Badge>
      case PaymentStatus.DUE:
        return <Badge variant="destructive">Due</Badge>
      case PaymentStatus.PARTIAL:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Partial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRenewalStatusBadge = (status: RenewalStatus) => {
    switch (status) {
      case RenewalStatus.RENEWED:
        return <Badge variant="default" className="bg-blue-500">Renewed</Badge>
      case RenewalStatus.PENDING:
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Pending</Badge>
      case RenewalStatus.NOT_RENEWED:
        return <Badge variant="secondary">Not Renewed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) throw error

      setCustomers(customers.filter(c => c.id !== customerId))
    } catch (error) {
      console.error('Error deleting customer:', error)
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href={`/accounts/${accountId}`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Account
              </Button>
            </Link>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <p className="text-gray-600 mt-2">
                  {account.platform?.name || 'Unknown Platform'} - {account.email}
                </p>
                <p className="text-sm text-gray-500">
                  {customers.length} / {account.maxCustomers} customers
                </p>
              </div>
              <Link href={`/accounts/${accountId}/customers/create`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value as PaymentStatus | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Payment Status</option>
                  <option value="paid">Paid</option>
                  <option value="due">Due</option>
                  <option value="partial">Partial</option>
                </select>
                <select
                  value={filterRenewalStatus}
                  onChange={(e) => setFilterRenewalStatus(e.target.value as RenewalStatus | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Renewal Status</option>
                  <option value="pending">Pending</option>
                  <option value="renewed">Renewed</option>
                  <option value="notRenewed">Not Renewed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Customers List */}
          {filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-500 mb-4 mt-4">
                  {customers.length === 0 ? "No customers added yet." : "No customers match your filters."}
                </p>
                {customers.length === 0 && (
                  <Link href={`/accounts/${accountId}/customers/create`}>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Customer
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{customer.customerName}</h3>
                        <div className="space-y-1 mt-2">
                          {customer.customerEmail && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-3 h-3 mr-1" />
                              {customer.customerEmail}
                            </div>
                          )}
                          {customer.customerPhone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="w-3 h-3 mr-1" />
                              {customer.customerPhone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          Slot {customer.slotNumber}
                        </Badge>
                        {getPaymentStatusBadge(customer.paymentStatus)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Amount:</span>
                        <span className="font-medium">৳{customer.amountPaid}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{customer.durationDays} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Purchase Date:</span>
                        <span className="font-medium flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {customer.purchaseDate.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Expiry Date:</span>
                        <span className="font-medium flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {customer.expiryDate.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Renewal:</span>
                        {getRenewalStatusBadge(customer.renewalStatus)}
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="flex space-x-2">
                          <Link href={`/accounts/${accountId}/customers/${customer.id}/notes`}>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Notes
                            </Button>
                          </Link>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/accounts/${accountId}/customers/${customer.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-3 h-3" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}