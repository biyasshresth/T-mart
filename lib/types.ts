export interface User {
  id: string
  email: string
  password: string
  name: string
  createdAt: string
}

export interface Business {
  id: string
  userId: string
  name: string
  type: string
  address: string
  phone: string
  email: string
  createdAt: string
}

export interface BankAccount {
  id: string
  businessId: string
  bankName: string
  accountNumber: string
  accountType: string
  balance: number
  createdAt: string
}

export interface Cheque {
  id: string
  bankAccountId: string
  chequeNumber: string
  payee: string
  amount: number
  date: string
  memo: string
  status: "pending" | "cleared" | "cancelled"
  createdAt: string
}

export interface Customer {
  id: string
  businessId: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
}

export interface Invoice {
  id: string
  businessId: string
  customerId: string
  invoiceNumber: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  status: "draft" | "sent" | "paid" | "overdue"
  createdAt: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface Supplier {
  id: string
  businessId: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  businessId: string
  supplierId: string
  orderNumber: string
  date: string
  expectedDate: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  total: number
  status: "draft" | "ordered" | "received" | "paid"
  createdAt: string
}

export interface PurchaseItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface CreditAccount {
  id: string
  businessId: string
  accountName: string
  creditLimit: number
  currentBalance: number
  interestRate: number
  createdAt: string
}

export interface CreditTransaction {
  id: string
  creditAccountId: string
  type: "charge" | "payment"
  amount: number
  description: string
  date: string
  createdAt: string
}
