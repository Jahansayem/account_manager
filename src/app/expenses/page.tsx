'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { FinancialRecordEntity, AccountEntity } from '@/lib/types/entities'
import { RecordType, AccountType, AccountStatus, IconType } from '@/lib/types/enums'
import { Database } from '@/lib/types/database'
import { DollarSign, Search, TrendingDown, TrendingUp, Calendar, Eye, Edit, Filter, BarChart3 } from 'lucide-react'
import Link from 'next/link'

interface FinancialRecordWithAccount extends FinancialRecordEntity {
  account: AccountEntity
}

export default function ExpensesOverviewPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<FinancialRecordWithAccount[]>([])
  const [filteredRecords, setFilteredRecords] = useState<FinancialRecordWithAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<RecordType | 'all'>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterDateRange, setFilterDateRange] = useState<string>('all')
  const [platforms, setPlatforms] = useState<Array<{ id: string, name: string }>>([])
  const [statistics, setStatistics] = useState({
    totalRecords: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    avgTransactionAmount: 0,
    incomeRecords: 0,
    expenseRecords: 0,
  })

  useEffect(() => {
    if (user) {
      fetchFinancialRecords()
      fetchPlatforms()
    }
  }, [user])

  useEffect(() => {
    filterRecords()
    calculateStatistics()
  }, [records, searchTerm, filterType, filterPlatform, filterDateRange])

  const fetchFinancialRecords = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          accounts (
            *,
            platforms (*)
          )
        `)
        .eq('accounts.user_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      type FinancialRecordWithJoins = Database['public']['Tables']['financial_records']['Row'] & {
        accounts: (Database['public']['Tables']['accounts']['Row'] & {
          platforms: Database['public']['Tables']['platforms']['Row'] | null
        }) | null
      }

      const financialRows = (data || []) as FinancialRecordWithJoins[]
      const recordsWithAccounts = financialRows.map(recordData => {
        const record: FinancialRecordWithAccount = {
          id: recordData.id,
          accountId: recordData.account_id,
          description: recordData.description,
          amount: recordData.amount,
          recordType: recordData.record_type as RecordType,
          category: recordData.category ?? undefined,
          notes: recordData.notes ?? undefined,
          date: new Date(recordData.date),
          createdAt: new Date(recordData.created_at),
          updatedAt: new Date(recordData.updated_at),
          account: recordData.accounts ? {
            id: recordData.accounts.id,
            email: recordData.accounts.email,
            accountType: recordData.accounts.account_type as AccountType,
            maxCustomers: recordData.accounts.max_customers,
            purchaseDate: new Date(recordData.accounts.purchase_date),
            expiryDate: new Date(recordData.accounts.expiry_date),
            totalAmount: recordData.accounts.total_amount,
            status: recordData.accounts.status as AccountStatus,
            loginInstructions: recordData.accounts.login_instructions ?? undefined,
            notes: recordData.accounts.notes ?? undefined,
            createdAt: new Date(recordData.accounts.created_at),
            updatedAt: new Date(recordData.accounts.updated_at),
            platform: recordData.accounts.platforms ? {
              id: recordData.accounts.platforms.id,
              name: recordData.accounts.platforms.name,
              description: recordData.accounts.platforms.description || undefined,
              iconType: recordData.accounts.platforms.icon_type as IconType,
              iconValue: recordData.accounts.platforms.icon_data,
              color: recordData.accounts.platforms.color_hex,
              category: recordData.accounts.platforms.category || undefined,
              isActive: recordData.accounts.platforms.is_active,
            } : undefined,
          } : {
            id: '',
            email: '',
            accountType: AccountType.PRIVATE,
            maxCustomers: 0,
            purchaseDate: new Date(),
            expiryDate: new Date(),
            totalAmount: 0,
            status: AccountStatus.ACTIVE
          } as AccountEntity,
        }
        return record
      })

      setRecords(recordsWithAccounts)
    } catch (error) {
      console.error('Error fetching financial records:', error)
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
      const platformRows = (data || []) as Database['public']['Tables']['platforms']['Row'][]
      setPlatforms(platformRows)
    } catch (error) {
      console.error('Error fetching platforms:', error)
    }
  }

  const filterRecords = () => {
    let filtered = records

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.account.platform?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.recordType === filterType)
    }

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(record => record.account.platform?.id === filterPlatform)
    }

    if (filterDateRange !== 'all') {
      const now = new Date()
      const startDate = new Date()

      switch (filterDateRange) {
        case '7days':
          startDate.setDate(now.getDate() - 7)
          break
        case '30days':
          startDate.setDate(now.getDate() - 30)
          break
        case '90days':
          startDate.setDate(now.getDate() - 90)
          break
        case '1year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      if (filterDateRange !== 'all') {
        filtered = filtered.filter(record => record.date >= startDate)
      }
    }

    setFilteredRecords(filtered)
  }

  const calculateStatistics = () => {
    const stats = records.reduce((acc, record) => {
      acc.totalRecords++
      
      if (record.recordType === RecordType.INCOME) {
        acc.totalIncome += record.amount
        acc.incomeRecords++
      } else {
        acc.totalExpenses += record.amount
        acc.expenseRecords++
      }

      return acc
    }, {
      totalRecords: 0,
      totalIncome: 0,
      totalExpenses: 0,
      incomeRecords: 0,
      expenseRecords: 0,
    })

    setStatistics({
      ...stats,
      netProfit: stats.totalIncome - stats.totalExpenses,
      avgTransactionAmount: stats.totalRecords > 0 ? (stats.totalIncome + stats.totalExpenses) / stats.totalRecords : 0,
    })
  }

  const getTypeIcon = (type: RecordType) => {
    return type === RecordType.INCOME ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    )
  }

  const getTypeBadge = (type: RecordType) => {
    return type === RecordType.INCOME ? (
      <Badge variant="default" className="bg-green-500">Income</Badge>
    ) : (
      <Badge variant="destructive">Expense</Badge>
    )
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
              <BarChart3 className="w-8 h-8 mr-3" />
              Financial Overview
            </h1>
            <p className="text-gray-600 mt-2">
              Overview of all income and expenses across your accounts
            </p>
          </div>

          {/* Statistics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">৳{statistics.totalIncome.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{statistics.incomeRecords} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">৳{statistics.totalExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{statistics.expenseRecords} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${statistics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{statistics.netProfit.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics.netProfit >= 0 ? 'Profit' : 'Loss'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{statistics.avgTransactionAmount.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{statistics.totalRecords} total records</p>
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
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as RecordType | 'all')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value={RecordType.INCOME}>Income</option>
                      <option value={RecordType.EXPENSE}>Expenses</option>
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
                  <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 3 Months</option>
                    <option value="1year">Last Year</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Records List */}
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-500 mb-4 mt-4">
                  {records.length === 0 ? "No financial records found." : "No records match your filters."}
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
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-left p-4 font-medium">Description</th>
                        <th className="text-left p-4 font-medium">Account/Platform</th>
                        <th className="text-left p-4 font-medium">Category</th>
                        <th className="text-left p-4 font-medium">Amount</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(record.recordType)}
                              {getTypeBadge(record.recordType)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{record.description}</p>
                              {record.notes && (
                                <p className="text-sm text-gray-500">{record.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{record.account.email}</p>
                              {record.account.platform && (
                                <div className="flex items-center mt-1">
                                  <div 
                                    className="w-3 h-3 rounded mr-2" 
                                    style={{ backgroundColor: record.account.platform.color }}
                                  />
                                  <span className="text-sm text-gray-600">{record.account.platform.name}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {record.category && (
                              <Badge variant="outline">{record.category}</Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`font-semibold ${
                              record.recordType === RecordType.INCOME ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {record.recordType === RecordType.INCOME ? '+' : '-'}৳{record.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            {record.date.toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <Link href={`/accounts/${record.accountId}/financial`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </Link>
                              <Link href={`/accounts/${record.accountId}/financial/${record.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  <Edit className="w-3 h-3" />
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