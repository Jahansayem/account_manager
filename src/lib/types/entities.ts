import { AccountType, AccountStatus, PaymentStatus, RenewalStatus, IconType, RecordType } from './enums'

export interface PlatformEntity {
  id: string
  name: string
  description?: string
  iconType: IconType
  iconValue: string
  color: string
  category?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface AccountEntity {
  id: string
  email: string
  platform?: PlatformEntity
  accountType: AccountType
  maxCustomers: number
  purchaseDate: Date
  expiryDate: Date
  totalAmount: number
  currency: string
  status: AccountStatus
  loginInstructions?: string
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface CustomerEntity {
  id: string
  accountId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  purchaseDate: Date
  durationDays: number
  expiryDate: Date
  amountPaid: number
  paymentStatus: PaymentStatus
  notes?: string
  slotNumber: number
  renewalStatus: RenewalStatus
  renewalReminderSent: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface CustomerNoteEntity {
  id: string
  customerId: string
  accountId: string
  noteText: string
  timestamp: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface ExpenseEntity {
  id: string
  accountId: string
  description: string
  amount: number
  category: string
  date: Date
  recordType: RecordType
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface FinancialRecordEntity {
  id: string
  accountId: string
  amount: number
  recordType: RecordType
  description: string
  date: Date
  category?: string
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface UserEntity {
  id: string
  email: string
  name?: string
  createdAt?: Date
  updatedAt?: Date
}

// Computed interfaces for statistics
export interface AccountStatistics {
  totalAccounts: number
  privateAccounts: number
  sharedAccounts: number
  activeAccounts: number
  expiredAccounts: number
  expiringSoonAccounts: number
  totalValue: number
}

// Utility types
export type CreateAccountInput = Omit<AccountEntity, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateAccountInput = Partial<Omit<AccountEntity, 'id' | 'createdAt' | 'updatedAt'>>
export type CreateCustomerInput = Omit<CustomerEntity, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateCustomerInput = Partial<Omit<CustomerEntity, 'id' | 'createdAt' | 'updatedAt'>>