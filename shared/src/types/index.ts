// Tipos compartidos entre backend y frontend

export enum Role {
  PROVIDER = 'PROVIDER',
  CLIENT_VIEWER = 'CLIENT_VIEWER',
  CLIENT_APPROVER = 'CLIENT_APPROVER',
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum DocumentType {
  INVOICE = 'INVOICE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  RECEIPT = 'RECEIPT'
}

export enum DocumentStatus {
  PROCESSING = 'PROCESSING',
  PRESENTED = 'PRESENTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED'
}

export enum ParseStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum PaymentStatus {
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED'
}

export enum NotificationType {
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_PARSED = 'DOCUMENT_PARSED',
  DOCUMENT_STATUS_CHANGED = 'DOCUMENT_STATUS_CHANGED',
  PAYMENT_ISSUED = 'PAYMENT_ISSUED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED'
}

// Interfaces para API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
