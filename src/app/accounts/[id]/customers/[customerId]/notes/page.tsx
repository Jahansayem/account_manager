'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { CustomerEntity, CustomerNoteEntity } from '@/lib/types/entities'
import { ArrowLeft, MessageSquare, Plus, Clock, Trash2, User } from 'lucide-react'
import Link from 'next/link'

export default function CustomerNotesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string
  const customerId = params.customerId as string
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerEntity | null>(null)
  const [notes, setNotes] = useState<CustomerNoteEntity[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    if (customerId && accountId) {
      fetchCustomer()
      fetchNotes()
    }
  }, [customerId, accountId])

  const fetchCustomer = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          accounts!inner(user_id)
        `)
        .eq('id', customerId)
        .eq('account_id', accountId)
        .eq('accounts.user_id', user.id)
        .single()

      if (error) throw error

      const customerData: CustomerEntity = {
        ...data,
        accountId: data.account_id,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        purchaseDate: new Date(data.purchase_date),
        durationDays: data.duration_days,
        expiryDate: new Date(data.expiry_date),
        amountPaid: data.amount_paid,
        paymentStatus: data.payment_status,
        slotNumber: data.slot_number,
        renewalStatus: data.renewal_status,
        renewalReminderSent: data.renewal_reminder_sent,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      setCustomer(customerData)
    } catch (error) {
      console.error('Error fetching customer:', error)
      router.push(`/accounts/${accountId}/customers`)
    }
  }

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const notesData = data.map(note => ({
        ...note,
        customerId: note.customer_id,
        accountId: note.account_id,
        noteText: note.note_text,
        timestamp: new Date(note.timestamp),
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      })) as CustomerNoteEntity[]

      setNotes(notesData)
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() || !user) return

    setAddingNote(true)
    try {
      const now = new Date()
      const { data, error } = await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          account_id: accountId,
          note_text: newNote.trim(),
          timestamp: now.toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      const noteData: CustomerNoteEntity = {
        ...data,
        customerId: data.customer_id,
        accountId: data.account_id,
        noteText: data.note_text,
        timestamp: new Date(data.timestamp),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      setNotes([noteData, ...notes])
      setNewNote('')
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      setNotes(notes.filter(note => note.id !== noteId))
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
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

  if (!customer) {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href={`/accounts/${accountId}/customers`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Customers
              </Button>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{customer.customerName}</h1>
                <p className="text-gray-600 mt-1">
                  Customer Notes • Slot {customer.slotNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Customer Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customer.customerEmail && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm">{customer.customerEmail}</p>
                    </div>
                  )}
                  {customer.customerPhone && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-sm">{customer.customerPhone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount Paid</p>
                    <p className="text-sm">৳{customer.amountPaid}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Expiry Date</p>
                    <p className="text-sm">{customer.expiryDate.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Status</p>
                    <p className={`text-sm font-medium ${
                      customer.paymentStatus === 'paid' ? 'text-green-600' :
                      customer.paymentStatus === 'due' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {customer.paymentStatus.toUpperCase()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes Section */}
            <div className="lg:col-span-2">
              {/* Add Note Form */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Note
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddNote} className="space-y-4">
                    <Textarea
                      placeholder="Enter your note here..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={addingNote || !newNote.trim()}>
                        {addingNote ? 'Adding...' : 'Add Note'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Notes List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Notes History ({notes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notes.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="text-gray-500 mb-4 mt-4">No notes yet</p>
                      <p className="text-sm text-gray-400">
                        Add your first note using the form above
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div key={note.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(note.timestamp)}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(note.timestamp)}</span>
                              <span>•</span>
                              <span>{note.timestamp.toLocaleDateString()}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {note.noteText}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}