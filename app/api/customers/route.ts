import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData } from "@/lib/data-store"
import type { Customer } from "@/lib/types"
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
    const customers = await readData<Customer>("customers")
    const businessCustomers = customers.filter((customer) => customer.businessId === businessId)
    return NextResponse.json(businessCustomers)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { businessId, name, email, phone, address } = await request.json()

    if (!businessId || !name) {
      return NextResponse.json({ error: "Business ID and name required" }, { status: 400 })
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      businessId,
      name,
      email: email || "",
      phone: phone || "",
      address: address || "",
      createdAt: new Date().toISOString(),
    }

    await addRecord("customers", newCustomer)
    return NextResponse.json(newCustomer)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
