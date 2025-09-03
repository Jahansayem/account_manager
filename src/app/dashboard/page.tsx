'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AccountEntity, CustomerEntity, FinancialRecordEntity } from '@/lib/types/entities'
import { AccountStatus, PaymentStatus, RecordType } from '@/lib/types/enums'
import { 
  LogOut, User, Plus, TrendingUp, TrendingDown, Calendar, 
  DollarSign, Users, CreditCard, AlertTriangle, Clock,
  BarChart3, PieChart, Activity
} from 'lucide-react'
import Link from 'next/link'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

interface DashboardStats {
  totalAccounts: number
  activeAccounts: number
  totalCustomers: number
  totalRevenue: number
  monthlyRevenue: number
  expiredAccounts: number
  expiringSoonAccounts: number
  paidCustomers: number
  dueCustomers: number
  partialPayments: number
}

interface MonthlyData {
  month: string
  revenue: number
  customers: number
  accounts: number
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    expiredAccounts: 0,
    expiringSoonAccounts: 0,
    paidCustomers: 0,
    dueCustomers: 0,
    partialPayments: 0,
  })
  const [accounts, setAccounts] = useState<AccountEntity[]>([])
  const [customers, setCustomers] = useState<CustomerEntity[]>([])
  const [recentAccounts, setRecentAccounts] = useState<AccountEntity[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [platformData, setPlatformData] = useState<Array<{name: string, count: number, revenue: number, color: string}>>([])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      await Promise.all([
        fetchAccounts(),
        fetchCustomers(),
        fetchFinancialData(),
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        *,
        platforms (*)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const accountsData = data.map(account => ({
      ...account,
      accountType: account.account_type,
      maxCustomers: account.max_customers,
      purchaseDate: new Date(account.purchase_date),
      expiryDate: new Date(account.expiry_date),
      totalAmount: account.total_amount,
      loginInstructions: account.login_instructions,
      createdAt: new Date(account.created_at),
      updatedAt: new Date(account.updated_at),
      platform: account.platforms ? {
        id: account.platforms.id,
        name: account.platforms.name,
        description: account.platforms.description,
        iconType: account.platforms.icon_type,
        iconValue: account.platforms.icon_value,
        color: account.platforms.color,
        category: account.platforms.category,
        isActive: account.platforms.is_active,
      } : undefined,
    })) as AccountEntity[]

    setAccounts(accountsData)
    setRecentAccounts(accountsData.slice(0, 5))
    calculateAccountStats(accountsData)
    generateMonthlyData(accountsData)
    generatePlatformData(accountsData)
  }

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', user!.id)

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
      renewalStatus: customer.renewal_status,
      renewalReminderSent: customer.renewal_reminder_sent,
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at),
    })) as CustomerEntity[]

    setCustomers(customersData)
    calculateCustomerStats(customersData)
  }

  const fetchFinancialData = async () => {
    const { data, error } = await supabase
      .from('financial_records')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', user!.id)

    if (error) return // Financial records might not exist yet

    const financialData = data.map(record => ({
      ...record,
      accountId: record.account_id,
      recordType: record.record_type as RecordType,
      date: new Date(record.date),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    })) as FinancialRecordEntity[]

    calculateFinancialStats(financialData)
  }

  const calculateAccountStats = (accountsData: AccountEntity[]) => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const accountStats = accountsData.reduce((acc, account) => {
      acc.totalAccounts++
      acc.totalRevenue += account.totalAmount

      if (account.status === AccountStatus.ACTIVE) {
        acc.activeAccounts++
      }

      if (account.expiryDate < now) {
        acc.expiredAccounts++
      } else if (account.expiryDate <= sevenDaysFromNow) {
        acc.expiringSoonAccounts++
      }

      if (account.createdAt && account.createdAt >= thisMonth) {
        acc.monthlyRevenue += account.totalAmount
      }

      return acc
    }, {
      totalAccounts: 0,
      activeAccounts: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      expiredAccounts: 0,
      expiringSoonAccounts: 0,
    })

    setStats(prev => ({ ...prev, ...accountStats }))
  }

  const calculateCustomerStats = (customersData: CustomerEntity[]) => {
    const customerStats = customersData.reduce((acc, customer) => {
      acc.totalCustomers++

      switch (customer.paymentStatus) {
        case PaymentStatus.PAID:
          acc.paidCustomers++
          break
        case PaymentStatus.DUE:
          acc.dueCustomers++
          break
        case PaymentStatus.PARTIAL:
          acc.partialPayments++
          break
      }

      return acc
    }, {
      totalCustomers: 0,
      paidCustomers: 0,
      dueCustomers: 0,
      partialPayments: 0,
    })

    setStats(prev => ({ ...prev, ...customerStats }))
  }

  const calculateFinancialStats = (financialData: FinancialRecordEntity[]) => {
    // Additional financial calculations can be added here
  }

  const generateMonthlyData = (accountsData: AccountEntity[]) => {
    const monthlyMap = new Map<string, MonthlyData>()
    const now = new Date()
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7)
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      
      monthlyMap.set(monthKey, {
        month: monthName,
        revenue: 0,
        customers: 0,
        accounts: 0,
      })
    }

    // Aggregate account data by month
    accountsData.forEach(account => {
      if (account.createdAt) {
        const monthKey = account.createdAt.toISOString().slice(0, 7)
        const existing = monthlyMap.get(monthKey)
        if (existing) {
          existing.accounts++
          existing.revenue += account.totalAmount
        }
      }
    })

    // Aggregate customer data by month
    customers.forEach(customer => {
      if (customer.createdAt) {
        const monthKey = customer.createdAt.toISOString().slice(0, 7)
        const existing = monthlyMap.get(monthKey)
        if (existing) {
          existing.customers++
        }
      }
    })

    setMonthlyData(Array.from(monthlyMap.values()))
  }

  const generatePlatformData = (accountsData: AccountEntity[]) => {
    const platformMap = new Map<string, { name: string, count: number, revenue: number, color: string }>()

    accountsData.forEach(account => {
      if (account.platform) {
        const existing = platformMap.get(account.platform.id)
        if (existing) {
          existing.count++
          existing.revenue += account.totalAmount
        } else {
          platformMap.set(account.platform.id, {
            name: account.platform.name,
            count: 1,
            revenue: account.totalAmount,
            color: account.platform.color,
          })
        }
      }
    })

    const data = Array.from(platformMap.values()).map((item, index) => ({
      ...item,
      color: item.color || `hsl(${index * 45}, 70%, 50%)`,
    }))

    setPlatformData(data)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const getStatusBadge = (status: AccountStatus, expiryDate: Date) => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (expiryDate < now) {
      return <Badge variant="destructive">Expired</Badge>
    } else if (expiryDate <= sevenDaysFromNow) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Expiring Soon</Badge>
    }

    switch (status) {
      case AccountStatus.ACTIVE:
        return <Badge variant="default" className="bg-green-500">Active</Badge>
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">Account Manager Dashboard</h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{user?.email}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-4">
              <Link href="/accounts">
                <Button>
                  <Users className="w-4 h-4 mr-2" />
                  View All Accounts
                </Button>
              </Link>
              <Link href="/accounts/create">
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </Link>
              <Link href="/platforms">
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Manage Platforms
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAccounts}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeAccounts} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.paidCustomers} paid, {stats.dueCustomers} due
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  ৳{stats.monthlyRevenue.toFixed(2)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.expiredAccounts + stats.expiringSoonAccounts}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.expiredAccounts} expired, {stats.expiringSoonAccounts} expiring soon
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Monthly Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Revenue (৳)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="accounts" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Accounts"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="customers" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        name="Customers"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Platform Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {platformData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="count"
                          nameKey="name"
                          label={({ name, count }) => `${name}: ${count}`}
                        >
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No platform data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Accounts */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Accounts
                </CardTitle>
                <Link href="/accounts">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No accounts yet</p>
                  <Link href="/accounts/create">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Account
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        {account.platform && (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: account.platform.color }}
                          >
                            {account.platform.iconType === 'emoji' ? (
                              <span className="text-lg">{account.platform.iconValue}</span>
                            ) : (
                              <span className="text-xs">{account.platform.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{account.platform?.name || 'Unknown Platform'}</p>
                          <p className="text-sm text-gray-500">{account.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">৳{account.totalAmount}</p>
                          <p className="text-xs text-gray-500">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {account.expiryDate.toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(account.status, account.expiryDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}