import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData } from "@/lib/data-store"
import type { CreditAccount } from "@/lib/types"
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
    const creditAccounts = await readData<CreditAccount>("credit-accounts")
    const businessAccounts = creditAccounts.filter((account) => account.businessId === businessId)
    return NextResponse.json(businessAccounts)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch credit accounts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { businessId, accountName, creditLimit, interestRate } = await request.json()

    if (!businessId || !accountName || creditLimit === undefined) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    const newCreditAccount: CreditAccount = {
      id: Date.now().toString(),
      businessId,
      accountName,
      creditLimit: Number.parseFloat(creditLimit),
      currentBalance: 0,
      interestRate: Number.parseFloat(interestRate) || 0,
      createdAt: new Date().toISOString(),
    }

    await addRecord("credit-accounts", newCreditAccount)
    return NextResponse.json(newCreditAccount)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create credit account" }, { status: 500 })
  }
}
