'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { CustomerEntity, AccountEntity } from '@/lib/types/entities'
import { PaymentStatus } from '@/lib/types/enums'
import { Users, Search, Mail, Phone, DollarSign, Calendar, Eye, Edit, MessageSquare, Filter } from 'lucide-react'
import Link from 'next/link'

interface CustomerWithAccount extends CustomerEntity {
  account: AccountEntity
}

export default function CustomersOverviewPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<CustomerWithAccount[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [platforms, setPlatforms] = useState<Array<{ id: string, name: string }>>([])
  const [statistics, setStatistics] = useState({
    totalCustomers: 0,
    paidCustomers: 0,
    pendingCustomers: 0,
    overdueCustomers: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    if (user) {
      fetchCustomersAndAccounts()
      fetchPlatforms()
    }
  }, [user])

  useEffect(() => {
    filterCustomers()
    calculateStatistics()
  }, [customers, searchTerm, filterStatus, filterPlatform])

  const fetchCustomersAndAccounts = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          accounts (
            *,
            platforms (*)
          )
        `)
        .eq('accounts.user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const customersWithAccounts = (data || []).map(customerData => {
        const customer: CustomerWithAccount = {
          id: customerData.id,
          accountId: customerData.account_id,
          customerName: customerData.customer_name,
          customerEmail: customerData.customer_email,
          customerPhone: customerData.customer_phone,
          amountPaid: customerData.amount_paid,
          currency: customerData.currency,
          paymentStatus: Object.values(PaymentStatus).includes(customerData.payment_status as PaymentStatus) 
            ? customerData.payment_status as PaymentStatus 
            : PaymentStatus.PENDING,
          notes: customerData.notes,
          purchaseDate: new Date(customerData.purchase_date),
          expiryDate: new Date(customerData.expiry_date),
          createdAt: new Date(customerData.created_at),
          updatedAt: new Date(customerData.updated_at),
          account: {
            id: (customerData.accounts as any).id,
            email: (customerData.accounts as any).email,
            accountType: (customerData.accounts as any).account_type,
            maxCustomers: (customerData.accounts as any).max_customers,
            purchaseDate: new Date((customerData.accounts as any).purchase_date),
            expiryDate: new Date((customerData.accounts as any).expiry_date),
            totalAmount: (customerData.accounts as any).total_amount,
            currency: (customerData.accounts as any).currency,
            status: (customerData.accounts as any).status,
            loginInstructions: (customerData.accounts as any).login_instructions,
            notes: (customerData.accounts as any).notes,
            createdAt: new Date((customerData.accounts as any).created_at),
            updatedAt: new Date((customerData.accounts as any).updated_at),
            platform: (customerData.accounts as any).platforms ? {
              id: (customerData.accounts as any).platforms.id,
              name: (customerData.accounts as any).platforms.name,
              description: (customerData.accounts as any).platforms.description,
              iconType: (customerData.accounts as any).platforms.icon_type,
              iconValue: (customerData.accounts as any).platforms.icon_value,
              color: (customerData.accounts as any).platforms.color,
              category: (customerData.accounts as any).platforms.category,
              isActive: (customerData.accounts as any).platforms.is_active,
            } : undefined,
          } as AccountEntity,
        }
        return customer
      })

      setCustomers(customersWithAccounts)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setPlatforms(data || [])
    } catch (error) {
      console.error('Error fetching platforms:', error)
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.account.platform?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(customer => customer.paymentStatus === filterStatus)
    }

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(customer => customer.account.platform?.id === filterPlatform)
    }

    setFilteredCustomers(filtered)
  }

  const calculateStatistics = () => {
    const stats = customers.reduce((acc, customer) => {
      acc.totalCustomers++
      acc.totalRevenue += customer.amountPaid

      switch (customer.paymentStatus) {
        case PaymentStatus.PAID:
          acc.paidCustomers++
          break
        case PaymentStatus.PENDING:
          acc.pendingCustomers++
          break
        case PaymentStatus.OVERDUE:
          acc.overdueCustomers++
          break
      }

      return acc
    }, {
      totalCustomers: 0,
      paidCustomers: 0,
      pendingCustomers: 0,
      overdueCustomers: 0,
      totalRevenue: 0,
    })

    setStatistics(stats)
  }

  const getStatusBadge = (status: PaymentStatus) => {
    const statusConfig = {
      [PaymentStatus.PAID]: { variant: 'default', className: 'bg-green-500', label: 'Paid' },
      [PaymentStatus.PENDING]: { variant: 'secondary', className: 'bg-yellow-500', label: 'Pending' },
      [PaymentStatus.OVERDUE]: { variant: 'destructive', className: 'bg-red-500', label: 'Overdue' },
      [PaymentStatus.CANCELLED]: { variant: 'outline', className: 'bg-gray-500', label: 'Cancelled' },
    }

    const config = statusConfig[status] || { variant: 'secondary', className: 'bg-gray-500', label: 'Unknown' }
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const isExpiringSoon = (expiryDate: Date) => {
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const isExpired = (expiryDate: Date) => {
    return expiryDate < new Date()
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3" />
              All Customers
            </h1>
            <p className="text-gray-600 mt-2">
              Overview of all customers across your accounts
            </p>
          </div>

          {/* Statistics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.paidCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{statistics.pendingCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <div className="w-3 h-3 bg-red-500 rounded-full" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.overdueCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">৳{statistics.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | 'all')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value={PaymentStatus.PAID}>Paid</option>
                      <option value={PaymentStatus.PENDING}>Pending</option>
                      <option value={PaymentStatus.OVERDUE}>Overdue</option>
                      <option value={PaymentStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Platforms</option>
                    {platforms.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers List */}
          {filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-500 mb-4 mt-4">
                  {customers.length === 0 ? "No customers found." : "No customers match your filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Customer</th>
                        <th className="text-left p-4 font-medium">Account/Platform</th>
                        <th className="text-left p-4 font-medium">Amount</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Expiry</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{customer.customerName}</p>
                              {customer.customerEmail && (
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {customer.customerEmail}
                                </div>
                              )}
                              {customer.customerPhone && (
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {customer.customerPhone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{customer.account.email}</p>
                              {customer.account.platform && (
                                <div className="flex items-center mt-1">
                                  <div 
                                    className="w-3 h-3 rounded mr-2" 
                                    style={{ backgroundColor: customer.account.platform.color }}
                                  />
                                  <span className="text-sm text-gray-600">{customer.account.platform.name}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-gray-900">
                              ৳{customer.amountPaid.toFixed(2)} {customer.currency}
                            </span>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(customer.paymentStatus)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${
                                isExpired(customer.expiryDate) ? 'text-red-600 font-medium' :
                                isExpiringSoon(customer.expiryDate) ? 'text-yellow-600 font-medium' :
                                'text-gray-600'
                              }`}>
                                {customer.expiryDate.toLocaleDateString()}
                              </span>
                              {isExpired(customer.expiryDate) && (
                                <Badge variant="destructive" className="text-xs">Expired</Badge>
                              )}
                              {!isExpired(customer.expiryDate) && isExpiringSoon(customer.expiryDate) && (
                                <Badge variant="secondary" className="text-xs bg-yellow-500">Expiring Soon</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <Link href={`/accounts/${customer.accountId}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </Link>
                              <Link href={`/accounts/${customer.accountId}/customers/${customer.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </Link>
                              <Link href={`/accounts/${customer.accountId}/customers/${customer.id}/notes`}>
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}