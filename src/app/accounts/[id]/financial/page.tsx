'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { FinancialRecordEntity, AccountEntity } from '@/lib/types/entities'
import { RecordType } from '@/lib/types/enums'
import { ArrowLeft, Plus, Search, DollarSign, TrendingUp, TrendingDown, Edit, Trash2, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function AccountFinancialPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [records, setRecords] = useState<FinancialRecordEntity[]>([])
  const [filteredRecords, setFilteredRecords] = useState<FinancialRecordEntity[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<RecordType | 'all'>('all')
  const [statistics, setStatistics] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    recordCount: 0,
  })

  useEffect(() => {
    if (accountId) {
      fetchAccount()
      fetchRecords()
    }
  }, [accountId])

  useEffect(() => {
    filterRecords()
    calculateStatistics()
  }, [records, searchTerm, filterType])

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

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: false })

      if (error) throw error

      const recordsData = (data || []).map(record => ({
        ...record,
        accountId: record.account_id,
        recordType: record.record_type as RecordType,
        date: new Date(record.date),
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at),
      })) as FinancialRecordEntity[]

      setRecords(recordsData)
    } catch (error) {
      console.error('Error fetching financial records:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterRecords = () => {
    let filtered = records

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.recordType === filterType)
    }

    setFilteredRecords(filtered)
  }

  const calculateStatistics = () => {
    const stats = records.reduce((acc, record) => {
      acc.recordCount++
      if (record.recordType === RecordType.INCOME) {
        acc.totalIncome += record.amount
      } else {
        acc.totalExpenses += record.amount
      }
      return acc
    }, {
      totalIncome: 0,
      totalExpenses: 0,
      recordCount: 0,
    })

    setStatistics({
      ...stats,
      netProfit: stats.totalIncome - stats.totalExpenses,
    })
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this financial record?')) return

    try {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      setRecords(records.filter(r => r.id !== recordId))
    } catch (error) {
      console.error('Error deleting financial record:', error)
    }
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
                <h1 className="text-3xl font-bold text-gray-900">Financial Records</h1>
                <p className="text-gray-600 mt-2">
                  {account.platform?.name || 'Unknown Platform'} - {account.email}
                </p>
              </div>
              <Link href={`/accounts/${accountId}/financial/create`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </Link>
            </div>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">৳{statistics.totalExpenses.toFixed(2)}</div>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.recordCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as RecordType | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Records List */}
          {filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-500 mb-4 mt-4">
                  {records.length === 0 ? "No financial records yet." : "No records match your filters."}
                </p>
                {records.length === 0 && (
                  <Link href={`/accounts/${accountId}/financial/create`}>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Record
                    </Button>
                  </Link>
                )}
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
                              <Link href={`/accounts/${accountId}/financial/${record.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
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