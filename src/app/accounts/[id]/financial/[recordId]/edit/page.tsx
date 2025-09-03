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
import { FinancialRecordEntity, AccountEntity } from '@/lib/types/entities'
import { RecordType } from '@/lib/types/enums'
import { ArrowLeft, DollarSign, Calendar, FileText, Tag } from 'lucide-react'
import Link from 'next/link'

export default function EditFinancialRecordPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const recordId = params.recordId as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [account, setAccount] = useState<AccountEntity | null>(null)
  const [record, setRecord] = useState<FinancialRecordEntity | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    recordType: RecordType.INCOME,
    category: '',
    notes: '',
    date: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (accountId && recordId) {
      fetchAccountAndRecord()
    }
  }, [accountId, recordId])

  const fetchAccountAndRecord = async () => {
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

      const account: AccountEntity = {
        id: accountData.id,
        email: accountData.email,
        accountType: accountData.account_type,
        maxCustomers: accountData.max_customers,
        purchaseDate: new Date(accountData.purchase_date),
        expiryDate: new Date(accountData.expiry_date),
        totalAmount: accountData.total_amount,
        status: accountData.status,
        loginInstructions: accountData.login_instructions,
        notes: accountData.notes,
        createdAt: new Date(accountData.created_at),
        updatedAt: new Date(accountData.updated_at),
        platform: accountData.platforms ? {
          id: accountData.platforms.id,
          name: accountData.platforms.name,
          description: accountData.platforms.description,
          iconType: accountData.platforms.icon_type,
          iconValue: accountData.platforms.icon_value,
          color: accountData.platforms.color,
          category: accountData.platforms.category,
          isActive: accountData.platforms.is_active,
        } : undefined,
      }

      // Fetch financial record
      const { data: recordData, error: recordError } = await supabase
        .from('financial_records')
        .select('*')
        .eq('id', recordId)
        .eq('account_id', accountId)
        .single()

      if (recordError) throw recordError
      if (!recordData) throw new Error('Financial record not found')

      const financialRecord: FinancialRecordEntity = {
        id: recordData.id,
        accountId: recordData.account_id,
        description: recordData.description,
        amount: recordData.amount,
        recordType: recordData.record_type as RecordType,
        category: recordData.category,
        notes: recordData.notes,
        date: new Date(recordData.date),
        createdAt: new Date(recordData.created_at),
        updatedAt: new Date(recordData.updated_at),
      }

      setAccount(account)
      setRecord(financialRecord)
      setFormData({
        description: financialRecord.description,
        amount: financialRecord.amount,
        recordType: financialRecord.recordType,
        category: financialRecord.category || '',
        notes: financialRecord.notes || '',
        date: financialRecord.date.toISOString().split('T')[0],
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      router.push(`/accounts/${accountId}/financial`)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user || !record) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('financial_records')
        .update({
          description: formData.description,
          amount: formData.amount,
          record_type: formData.recordType,
          category: formData.category || null,
          notes: formData.notes || null,
          date: formData.date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)

      if (error) throw error

      router.push(`/accounts/${accountId}/financial`)
    } catch (error) {
      console.error('Error updating financial record:', error)
      setErrors({ submit: 'Failed to update financial record. Please try again.' })
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

  if (!account || !record) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Record not found</p>
            <Link href={`/accounts/${accountId}/financial`}>
              <Button className="mt-4">Back to Financial Records</Button>
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
            <Link href={`/accounts/${accountId}/financial`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Financial Records
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Edit Financial Record</h1>
            <p className="text-gray-600 mt-2">
              Edit financial record for {account.platform?.name || 'Unknown Platform'} - {account.email}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Record Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="description"
                      type="text"
                      placeholder="Enter description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
                </div>

                {/* Record Type and Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="recordType">Type</Label>
                    <select
                      id="recordType"
                      value={formData.recordType}
                      onChange={(e) => handleInputChange('recordType', e.target.value as RecordType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={RecordType.INCOME}>Income</option>
                      <option value={RecordType.EXPENSE}>Expense</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter amount"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
                  </div>
                </div>

                {/* Category and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="category"
                        type="text"
                        placeholder="Enter category (optional)"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes (optional)"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>

                {errors.submit && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {errors.submit}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Link href={`/accounts/${accountId}/financial`}>
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