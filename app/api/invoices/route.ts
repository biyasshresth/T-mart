import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData } from "@/lib/data-store"
import type { Invoice, InvoiceItem } from "@/lib/types"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

async function getUserFromToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return null

  try {
    const decoded = verify(token, JWT_SECRET) as { userId: string }
    return decoded.userId
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get("businessId")

  if (!businessId) {
    return NextResponse.json({ error: "Business ID required" }, { status: 400 })
  }

  try {
    const invoices = await readData<Invoice>("invoices")
    const businessInvoices = invoices.filter((invoice) => invoice.businessId === businessId)
    return NextResponse.json(businessInvoices)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { businessId, customerId, invoiceNumber, date, dueDate, items, tax } = await request.json()

    if (!businessId || !customerId || !invoiceNumber || !date || !dueDate || !items || items.length === 0) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + item.amount, 0)
    const taxAmount = tax || 0
    const total = subtotal + taxAmount

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      businessId,
      customerId,
      invoiceNumber,
      date,
      dueDate,
      items: items.map((item: Omit<InvoiceItem, "id">, index: number) => ({
        ...item,
        id: `${Date.now()}-${index}`,
      })),
      subtotal,
      tax: taxAmount,
      total,
      status: "draft",
      createdAt: new Date().toISOString(),
    }

    await addRecord("invoices", newInvoice)
    return NextResponse.json(newInvoice)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}
