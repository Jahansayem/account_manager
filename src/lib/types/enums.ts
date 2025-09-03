export enum AccountType {
  PRIVATE = 'private',
  SHARED = 'shared',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum PaymentStatus {
  PAID = 'paid',
  DUE = 'due',
  PARTIAL = 'partial',
}

export enum ExpiryPriority {
  EXPIRED = 'expired',
  EXPIRING_SOON = 'expiringSoon',
  ACTIVE = 'active',
}

export enum RenewalStatus {
  PENDING = 'pending',
  RENEWED = 'renewed',
  NOT_RENEWED = 'notRenewed',
}

export enum IconType {
  EMOJI = 'emoji',
  IMAGE = 'image',
  TEXT = 'text',
  URL = 'url',
}

export enum RecordType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum FilterType {
  ALL = 'all',
  PRIVATE = 'private',
  SHARED = 'shared',
}

export enum SortType {
  DATE = 'date',
  EXPIRY = 'expiry',
  ALPHABETICAL = 'alphabetical',
}