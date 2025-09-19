import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData } from "@/lib/data-store"
import type { Business } from "@/lib/types"
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

  try {
    const businesses = await readData<Business>("businesses")
    const userBusinesses = businesses.filter((b) => b.userId === userId)
    return NextResponse.json(userBusinesses)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch businesses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, type, address, phone, email } = await request.json()

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type required" }, { status: 400 })
    }

    const newBusiness: Business = {
      id: Date.now().toString(),
      userId,
      name,
      type,
      address: address || "",
      phone: phone || "",
      email: email || "",
      createdAt: new Date().toISOString(),
    }

    await addRecord("businesses", newBusiness)
    return NextResponse.json(newBusiness)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create business" }, { status: 500 })
  }
}
