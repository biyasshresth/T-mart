import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData } from "@/lib/data-store"
import type { BankAccount } from "@/lib/types"
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
    const bankAccounts = await readData<BankAccount>("bank-accounts")
    const businessAccounts = bankAccounts.filter((account) => account.businessId === businessId)
    return NextResponse.json(businessAccounts)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { businessId, bankName, accountNumber, accountType, balance } = await request.json()

    if (!businessId || !bankName || !accountNumber || !accountType || balance === undefined) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 })
    }

    const newAccount: BankAccount = {
      id: Date.now().toString(),
      businessId,
      bankName,
      accountNumber,
      accountType,
      balance: Number.parseFloat(balance),
      createdAt: new Date().toISOString(),
    }

    await addRecord("bank-accounts", newAccount)
    return NextResponse.json(newAccount)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 })
  }
}
