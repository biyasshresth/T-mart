import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData } from "@/lib/data-store"
import type { PurchaseOrder, PurchaseItem } from "@/lib/types"
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
    const purchaseOrders = await readData<PurchaseOrder>("purchase-orders")
    const businessOrders = purchaseOrders.filter((order) => order.businessId === businessId)
    return NextResponse.json(businessOrders)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { businessId, supplierId, orderNumber, date, expectedDate, items, tax } = await request.json()

    if (!businessId || !supplierId || !orderNumber || !date || !expectedDate || !items || items.length === 0) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: PurchaseItem) => sum + item.amount, 0)
    const taxAmount = tax || 0
    const total = subtotal + taxAmount

    const newPurchaseOrder: PurchaseOrder = {
      id: Date.now().toString(),
      businessId,
      supplierId,
      orderNumber,
      date,
      expectedDate,
      items: items.map((item: Omit<PurchaseItem, "id">, index: number) => ({
        ...item,
        id: `${Date.now()}-${index}`,
      })),
      subtotal,
      tax: taxAmount,
      total,
      status: "draft",
      createdAt: new Date().toISOString(),
    }

    await addRecord("purchase-orders", newPurchaseOrder)
    return NextResponse.json(newPurchaseOrder)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
