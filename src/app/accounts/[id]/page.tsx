'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AccountEntity, CustomerEntity } from '@/lib/types/entities'
import { AccountType, AccountStatus } from '@/lib/types/enums'
import { ArrowLeft, Mail, Calendar, DollarSign, Users, Edit, Plus, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function AccountDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [customers, setCustomers] = useState<CustomerEntity[]>([])
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    paid: 0,
    due: 0,
    partial: 0
  })

  useEffect(() => {
    if (accountId) {
      fetchAccount()
      fetchCustomers()
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

      const accountData: AccountEntity = {
        ...data,
        accountType: data.account_type as AccountType,
        maxCustomers: data.max_customers,
        purchaseDate: new Date(data.purchase_date),
        expiryDate: new Date(data.expiry_date),
        totalAmount: data.total_amount,
        loginInstructions: data.login_instructions,
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
    } finally {
      setLoading(false)
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
        paymentStatus: customer.payment_status,
        slotNumber: customer.slot_number,
        renewalStatus: customer.renewal_status,
        renewalReminderSent: customer.renewal_reminder_sent,
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at),
      })) as CustomerEntity[]

      setCustomers(customersData)

      // Calculate customer statistics
      const stats = customersData.reduce(
        (acc, customer) => {
          acc.total++
          switch (customer.paymentStatus) {
            case 'paid':
              acc.paid++
              break
            case 'due':
              acc.due++
              break
            case 'partial':
              acc.partial++
              break
          }
          return acc
        },
        { total: 0, paid: 0, due: 0, partial: 0 }
      )

      setCustomerStats(stats)
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const getStatusBadge = (status: AccountStatus, expiryDate: Date) => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (expiryDate < now) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>
    } else if (expiryDate <= sevenDaysFromNow) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />Expiring Soon</Badge>
    }

    switch (status) {
      case AccountStatus.ACTIVE:
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
      case AccountStatus.INACTIVE:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Inactive</Badge>
      case AccountStatus.SUSPENDED:
        return <Badge variant="outline" className="border-red-500 text-red-600"><XCircle className="w-3 h-3 mr-1" />Suspended</Badge>
      case AccountStatus.ARCHIVED:
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Archived</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Paid</Badge>
      case 'due':
        return <Badge variant="destructive">Due</Badge>
      case 'partial':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Partial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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
            <Link href="/accounts">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Accounts
              </Button>
            </Link>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                {account.platform && (
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: account.platform.color }}
                  >
                    {account.platform.iconType === 'emoji' ? (
                      <span className="text-2xl">{account.platform.iconValue}</span>
                    ) : (
                      <span className="text-sm">{account.platform.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {account.platform?.name || 'Unknown Platform'}
                  </h1>
                  <div className="flex items-center space-x-2 mt-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{account.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(account.status, account.expiryDate)}
                <Link href={`/accounts/${account.id}/edit`}>
                  <Button>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            {/* Account Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Account Type</p>
                    <Badge variant="outline" className="mt-1">
                      {account.accountType === AccountType.PRIVATE ? 'Private' : 'Shared'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Max Customers</p>
                    <p className="text-lg font-semibold">{account.maxCustomers}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Purchase Date</p>
                    <p className="text-lg font-semibold flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {account.purchaseDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Expiry Date</p>
                    <p className="text-lg font-semibold flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {account.expiryDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Amount</p>
                    <p className="text-lg font-semibold flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      ৳{account.totalAmount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current Customers</p>
                    <p className="text-lg font-semibold flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {customers.length} / {account.maxCustomers}
                    </p>
                  </div>
                </div>
                
                {account.loginInstructions && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Login Instructions</p>
                    <p className="mt-1 text-gray-700 bg-gray-50 p-3 rounded-md">
                      {account.loginInstructions}
                    </p>
                  </div>
                )}
                
                {account.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="mt-1 text-gray-700 bg-gray-50 p-3 rounded-md">
                      {account.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{customerStats.total}</p>
                  <p className="text-gray-500">Total Customers</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Paid</span>
                    <span className="font-medium text-green-600">{customerStats.paid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Due</span>
                    <span className="font-medium text-red-600">{customerStats.due}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Partial</span>
                    <span className="font-medium text-yellow-600">{customerStats.partial}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Link href={`/accounts/${account.id}/customers`}>
                    <Button className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Manage Customers
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Customers */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Recent Customers</CardTitle>
                <Link href={`/accounts/${account.id}/customers/create`}>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-gray-500">No customers yet</p>
                  <Link href={`/accounts/${account.id}/customers/create`}>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Customer
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {customers.slice(0, 5).map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">{customer.customerName}</p>
                            <p className="text-sm text-gray-500">{customer.customerEmail}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">৳{customer.amountPaid}</p>
                          <p className="text-xs text-gray-500">Slot {customer.slotNumber}</p>
                        </div>
                        {getPaymentStatusBadge(customer.paymentStatus)}
                      </div>
                    </div>
                  ))}
                  {customers.length > 5 && (
                    <div className="text-center pt-4">
                      <Link href={`/accounts/${account.id}/customers`}>
                        <Button variant="outline">
                          View All {customers.length} Customers
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}