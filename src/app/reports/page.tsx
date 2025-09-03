'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { RecordType, PaymentStatus } from '@/lib/types/enums'
import { Database } from '@/lib/types/database'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import { 
  FileBarChart, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users,
  Globe,
  PieChart as PieChartIcon
} from 'lucide-react'

interface ReportData {
  monthlyRevenue: Array<{ month: string, income: number, expenses: number, profit: number }>
  platformBreakdown: Array<{ name: string, revenue: number, customers: number, color: string }>
  paymentStatus: Array<{ name: string, value: number, color: string }>
  revenueByCategory: Array<{ category: string, amount: number }>
  topAccounts: Array<{ email: string, revenue: number, customers: number, platform: string }>
  monthlyGrowth: Array<{ month: string, growth: number }>
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('12months')
  const [reportData, setReportData] = useState<ReportData>({
    monthlyRevenue: [],
    platformBreakdown: [],
    paymentStatus: [],
    revenueByCategory: [],
    topAccounts: [],
    monthlyGrowth: [],
  })
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCustomers: 0,
    totalAccounts: 0,
    avgRevenuePerCustomer: 0,
    growthRate: 0,
  })

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [user, dateRange])

  const fetchReportData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (dateRange) {
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '12months':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        case '2years':
          startDate.setFullYear(endDate.getFullYear() - 2)
          break
      }

      // Fetch data step by step to handle relationships properly
      const accountsResult = await supabase
        .from('accounts')
        .select(`*, platforms(*)`)
        .eq('user_id', user.id)

      if (accountsResult.error) throw accountsResult.error
      const accounts = (accountsResult.data || []) as (Database['public']['Tables']['accounts']['Row'] & {
        platforms: Database['public']['Tables']['platforms']['Row'] | null
      })[]

      const accountIds = accounts.map(acc => acc.id)

      const [
        customersResult,
        financialResult,
        platformsResult
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .in('account_id', accountIds),
        supabase
          .from('financial_records')
          .select('*')
          .in('account_id', accountIds)
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString()),
        supabase
          .from('platforms')
          .select('*')
          .eq('is_active', true)
      ])

      if (customersResult.error) throw customersResult.error
      if (financialResult.error) throw financialResult.error
      if (platformsResult.error) throw platformsResult.error

      const customers = (customersResult.data || []) as Database['public']['Tables']['customers']['Row'][]
      const financial = (financialResult.data || []) as Database['public']['Tables']['financial_records']['Row'][]
      const platforms = (platformsResult.data || []) as Database['public']['Tables']['platforms']['Row'][]

      // Process data for charts
      processReportData(accounts, customers, financial, platforms, startDate, endDate)
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processReportData = (
    accounts: (Database['public']['Tables']['accounts']['Row'] & {
      platforms: Database['public']['Tables']['platforms']['Row'] | null
    })[],
    customers: Database['public']['Tables']['customers']['Row'][],
    financial: Database['public']['Tables']['financial_records']['Row'][],
    platforms: Database['public']['Tables']['platforms']['Row'][],
    startDate: Date,
    endDate: Date
  ) => {
    // Monthly Revenue Data
    const monthlyRevenue = generateMonthlyRevenue(financial, startDate, endDate)
    
    // Platform Breakdown
    const platformBreakdown = generatePlatformBreakdown(accounts, customers, platforms)
    
    // Payment Status Distribution
    const paymentStatus = generatePaymentStatusData(customers)
    
    // Revenue by Category
    const revenueByCategory = generateRevenueByCategory(financial)
    
    // Top Accounts
    const topAccounts = generateTopAccounts(accounts, customers)
    
    // Monthly Growth
    const monthlyGrowth = generateMonthlyGrowth(monthlyRevenue)

    // Summary Statistics
    const totalRevenue = customers.reduce((sum, customer) => sum + (customer.amount_paid || 0), 0)
    const totalCustomers = customers.length
    const totalAccounts = accounts.length
    const avgRevenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0
    const growthRate = monthlyGrowth.length > 1 ? monthlyGrowth[monthlyGrowth.length - 1].growth : 0

    setReportData({
      monthlyRevenue,
      platformBreakdown,
      paymentStatus,
      revenueByCategory,
      topAccounts,
      monthlyGrowth,
    })

    setSummary({
      totalRevenue,
      totalCustomers,
      totalAccounts,
      avgRevenuePerCustomer,
      growthRate,
    })
  }

  const generateMonthlyRevenue = (financial: Database['public']['Tables']['financial_records']['Row'][], startDate: Date, endDate: Date) => {
    const monthlyData: Record<string, { income: number, expenses: number }> = {}
    
    // Initialize months
    const current = new Date(startDate)
    while (current <= endDate) {
      const monthKey = current.toISOString().slice(0, 7) // YYYY-MM
      monthlyData[monthKey] = { income: 0, expenses: 0 }
      current.setMonth(current.getMonth() + 1)
    }

    // Aggregate financial data
    financial.forEach(record => {
      const monthKey = record.date.slice(0, 7)
      if (monthlyData[monthKey]) {
        if (record.record_type === RecordType.INCOME) {
          monthlyData[monthKey].income += record.amount
        } else {
          monthlyData[monthKey].expenses += record.amount
        }
      }
    })

    return Object.entries(monthlyData).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }))
  }

  const generatePlatformBreakdown = (
    accounts: (Database['public']['Tables']['accounts']['Row'] & {
      platforms: Database['public']['Tables']['platforms']['Row'] | null
    })[],
    customers: Database['public']['Tables']['customers']['Row'][],
    platforms: Database['public']['Tables']['platforms']['Row'][]
  ) => {
    const platformData: Record<string, { revenue: number, customers: number, color: string }> = {}

    platforms.forEach(platform => {
      platformData[platform.id] = {
        revenue: 0,
        customers: 0,
        color: platform.color_hex || '#8884d8',
      }
    })

    customers.forEach(customer => {
      // Note: In this context, we need to match customers with accounts to get platform_id
      // This would require a proper join or separate lookup logic
      const account = accounts.find(acc => acc.id === customer.account_id)
      const platformId = account?.platform_id
      if (platformId && platformData[platformId]) {
        platformData[platformId].revenue += customer.amount_paid || 0
        platformData[platformId].customers += 1
      }
    })

    return platforms.map(platform => ({
      name: platform.name,
      revenue: platformData[platform.id]?.revenue || 0,
      customers: platformData[platform.id]?.customers || 0,
      color: platform.color_hex || '#8884d8',
    })).filter(item => item.revenue > 0 || item.customers > 0)
  }

  const generatePaymentStatusData = (customers: Database['public']['Tables']['customers']['Row'][]) => {
    const statusCounts: Record<string, number> = {}
    const statusColors = {
      [PaymentStatus.PAID]: '#22c55e',
      [PaymentStatus.DUE]: '#eab308',
      [PaymentStatus.PARTIAL]: '#f97316',
    }

    customers.forEach(customer => {
      const status = customer.payment_status || PaymentStatus.DUE
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: statusColors[status as PaymentStatus] || '#8884d8',
    }))
  }

  const generateRevenueByCategory = (financial: Database['public']['Tables']['financial_records']['Row'][]) => {
    const categoryData: Record<string, number> = {}

    financial.forEach(record => {
      if (record.record_type === RecordType.INCOME) {
        const category = record.category || 'Uncategorized'
        categoryData[category] = (categoryData[category] || 0) + record.amount
      }
    })

    return Object.entries(categoryData)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }

  const generateTopAccounts = (
    accounts: (Database['public']['Tables']['accounts']['Row'] & {
      platforms: Database['public']['Tables']['platforms']['Row'] | null
    })[],
    customers: Database['public']['Tables']['customers']['Row'][]
  ) => {
    const accountData: Record<string, { revenue: number, customers: number, platform: string }> = {}

    customers.forEach(customer => {
      const accountId = customer.account_id
      if (!accountData[accountId]) {
        const account = accounts.find(acc => acc.id === accountId)
        accountData[accountId] = {
          revenue: 0,
          customers: 0,
          platform: account?.platforms?.name || 'Unknown',
        }
      }
      accountData[accountId].revenue += customer.amount_paid || 0
      accountData[accountId].customers += 1
    })

    return accounts
      .map(account => ({
        email: account.email,
        revenue: accountData[account.id]?.revenue || 0,
        customers: accountData[account.id]?.customers || 0,
        platform: account.platforms?.name || 'Unknown',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }

  const generateMonthlyGrowth = (monthlyRevenue: Array<{ month: string, income: number, expenses: number, profit: number }>) => {
    return monthlyRevenue.map((current, index) => {
      if (index === 0) return { month: current.month, growth: 0 }
      
      const previous = monthlyRevenue[index - 1]
      const growth = previous.income > 0 
        ? ((current.income - previous.income) / previous.income) * 100
        : 0

      return { month: current.month, growth }
    })
  }

  const exportReport = () => {
    // Create CSV data
    const csvData = [
      ['Report Generated:', new Date().toLocaleDateString()],
      ['Date Range:', dateRange],
      [''],
      ['Summary'],
      ['Total Revenue', summary.totalRevenue.toFixed(2)],
      ['Total Customers', summary.totalCustomers],
      ['Total Accounts', summary.totalAccounts],
      ['Avg Revenue per Customer', summary.avgRevenuePerCustomer.toFixed(2)],
      [''],
      ['Monthly Revenue'],
      ['Month', 'Income', 'Expenses', 'Profit'],
      ...reportData.monthlyRevenue.map(row => [row.month, row.income, row.expenses, row.profit]),
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account-manager-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <FileBarChart className="w-8 h-8 mr-3" />
                  Analytics & Reports
                </h1>
                <p className="text-gray-600 mt-2">
                  Comprehensive insights into your business performance
                </p>
              </div>
              <div className="flex space-x-4">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="12months">Last 12 Months</option>
                  <option value="2years">Last 2 Years</option>
                </select>
                <Button onClick={exportReport} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{summary.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalAccounts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg per Customer</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{summary.avgRevenuePerCustomer.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                {summary.growthRate >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.growthRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#22c55e" />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.paymentStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    >
                      {reportData.paymentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.platformBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Growth Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.monthlyGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Growth Rate']} />
                    <Legend />
                    <Line type="monotone" dataKey="growth" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Accounts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Account</th>
                      <th className="text-left p-4 font-medium">Platform</th>
                      <th className="text-left p-4 font-medium">Revenue</th>
                      <th className="text-left p-4 font-medium">Customers</th>
                      <th className="text-left p-4 font-medium">Avg per Customer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topAccounts.map((account, index) => (
                      <tr key={account.email} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">#{index + 1}</span>
                            <span className="font-medium">{account.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-600">{account.platform}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-green-600">৳{account.revenue.toFixed(2)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-900">{account.customers}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-600">
                            ৳{account.customers > 0 ? (account.revenue / account.customers).toFixed(2) : '0.00'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}