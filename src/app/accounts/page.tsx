'use client'

import { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { AccountEntity, AccountStatistics } from '@/lib/types/entities'
import { AccountStatus, AccountType } from '@/lib/types/enums'
import { Plus, Search, Mail, DollarSign, Users, CheckCircle, XCircle, AlertCircle, Clock, Trash2, Copy } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'

export default function AccountsPage() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<AccountEntity[]>([])
  const [statistics, setStatistics] = useState<AccountStatistics>({
    totalAccounts: 0,
    privateAccounts: 0,
    sharedAccounts: 0,
    activeAccounts: 0,
    expiredAccounts: 0,
    expiringSoonAccounts: 0,
    totalValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<AccountStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<AccountType | 'all'>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<AccountEntity | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copyingInstructions, setCopyingInstructions] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const fetchAccounts = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          platforms (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const accountsData = data.map(account => ({
        ...account,
        accountType: account.account_type as AccountType,
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
      calculateStatistics(accountsData)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStatistics = (accountsData: AccountEntity[]) => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const stats = accountsData.reduce(
      (acc, account) => {
        acc.totalAccounts++
        acc.totalValue += account.totalAmount

        if (account.accountType === AccountType.PRIVATE) {
          acc.privateAccounts++
        } else {
          acc.sharedAccounts++
        }

        if (account.status === AccountStatus.ACTIVE) {
          acc.activeAccounts++
        }

        if (account.expiryDate < now) {
          acc.expiredAccounts++
        } else if (account.expiryDate <= sevenDaysFromNow) {
          acc.expiringSoonAccounts++
        }

        return acc
      },
      {
        totalAccounts: 0,
        privateAccounts: 0,
        sharedAccounts: 0,
        activeAccounts: 0,
        expiredAccounts: 0,
        expiringSoonAccounts: 0,
        totalValue: 0,
      }
    )

    setStatistics(stats)
  }

  const handleDeleteAccount = async () => {
    if (!accountToDelete || !user) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountToDelete.id)
        .eq('user_id', user.id) // Extra security check

      if (error) throw error

      // Update local state
      setAccounts(accounts.filter(account => account.id !== accountToDelete.id))
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
      
      // Recalculate statistics
      const updatedAccounts = accounts.filter(account => account.id !== accountToDelete.id)
      calculateStatistics(updatedAccounts)

    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (account: AccountEntity) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }

  const copyLoginInstructions = async (account: AccountEntity) => {
    if (!account.loginInstructions) {
      alert('No login instructions available for this account.')
      return
    }

    try {
      setCopyingInstructions(account.id)
      await navigator.clipboard.writeText(account.loginInstructions)
      
      // Show success feedback
      setTimeout(() => setCopyingInstructions(null), 1000)
    } catch (error) {
      console.error('Failed to copy instructions:', error)
      alert('Failed to copy instructions. Please try again.')
      setCopyingInstructions(null)
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

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.platform?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus
    const matchesType = filterType === 'all' || account.accountType === filterType

    return matchesSearch && matchesStatus && matchesType
  })

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
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
              <Link href="/accounts/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </Link>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalAccounts}</div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.privateAccounts} private, {statistics.sharedAccounts} shared
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.activeAccounts}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{statistics.expiringSoonAccounts}</div>
                  <p className="text-xs text-muted-foreground">
                    Within 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">৳{statistics.totalValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    All accounts combined
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as AccountStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as AccountType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="private">Private</option>
                <option value="shared">Shared</option>
              </select>
            </div>
          </div>

          {/* Accounts List */}
          {filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {accounts.length === 0 ? "You don't have any accounts yet." : "No accounts match your filters."}
                </p>
                {accounts.length === 0 && (
                  <Link href="/accounts/create">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Account
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {filteredAccounts.map((account) => (
                    <div key={account.id} className="relative">
                      <div className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-6">
                          {/* Left side - Platform info */}
                          <Link href={`/accounts/${account.id}`} className="flex items-center space-x-4 flex-1 cursor-pointer">
                            {account.platform && (
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                                style={{ backgroundColor: account.platform.color }}
                              >
                                {account.platform.iconType === 'emoji' ? (
                                  <span className="text-xl">{account.platform.iconValue}</span>
                                ) : (
                                  <span className="text-sm">{account.platform.name.slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {account.platform?.name || 'Unknown Platform'}
                                </h3>
                                {account.loginInstructions && (
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      copyLoginInstructions(account)
                                    }}
                                    disabled={copyingInstructions === account.id}
                                    className="bg-white shadow-sm h-6 w-6 p-0"
                                    title="Copy Login Instructions"
                                  >
                                    {copyingInstructions === account.id ? (
                                      <span className="text-green-600 text-xs">✓</span>
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Mail className="w-4 h-4 mr-2" />
                                {account.email}
                              </div>
                            </div>
                          </Link>

                          {/* Middle - Account details */}
                          <div className="hidden lg:flex items-center space-x-8 text-sm">
                            <div className="text-center min-w-[80px]">
                              <div className="font-medium text-gray-900">
                                {account.accountType === AccountType.PRIVATE ? 'Private' : 'Shared'}
                              </div>
                              <div className="text-gray-500 text-xs">Type</div>
                            </div>
                            <div className="text-center min-w-[80px]">
                              <div className="font-medium text-gray-900">{account.maxCustomers}</div>
                              <div className="text-gray-500 text-xs">Max Customers</div>
                            </div>
                            <div className="text-center min-w-[100px]">
                              <div className="font-medium text-gray-900">৳{account.totalAmount}</div>
                              <div className="text-gray-500 text-xs">Amount</div>
                            </div>
                            <div className="text-center min-w-[100px]">
                              <div className="font-medium text-gray-900">{account.expiryDate.toLocaleDateString()}</div>
                              <div className="text-gray-500 text-xs">Expires</div>
                            </div>
                          </div>

                          {/* Right side - Status */}
                          <div className="hidden md:flex items-center">
                            {getStatusBadge(account.status, account.expiryDate)}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Link href={`/accounts/${account.id}/customers`}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white shadow-sm"
                              >
                                Customers
                              </Button>
                            </Link>
                            <Link href={`/accounts/${account.id}/edit`}>
                              <Button 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="shadow-sm"
                              >
                                Edit
                              </Button>
                            </Link>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                openDeleteDialog(account)
                              }}
                              className="shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Mobile view - additional info */}
                        <div className="lg:hidden mt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Type: </span>
                              <span className="font-medium">{account.accountType === AccountType.PRIVATE ? 'Private' : 'Shared'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Customers: </span>
                              <span className="font-medium">{account.maxCustomers}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Amount: </span>
                              <span className="font-medium">৳{account.totalAmount}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Expires: </span>
                              <span className="font-medium">{account.expiryDate.toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="md:hidden">
                            <div className="flex justify-between items-center">
                              <div>{getStatusBadge(account.status, account.expiryDate)}</div>
                              <div className="flex space-x-2">
                                <Link href={`/accounts/${account.id}/customers`}>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Customers
                                  </Button>
                                </Link>
                                <Link href={`/accounts/${account.id}/edit`}>
                                  <Button 
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Edit
                                  </Button>
                                </Link>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    openDeleteDialog(account)
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the account for{' '}
                  <strong>{accountToDelete?.email}</strong>?
                  <br />
                  <br />
                  This action cannot be undone. All associated customers, financial records, 
                  and data will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setAccountToDelete(null)
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
}