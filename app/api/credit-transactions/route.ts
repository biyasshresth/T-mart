import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData, updateRecord } from "@/lib/data-store"
import type { CreditTransaction, CreditAccount } from "@/lib/types"
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
    const transactions = await readData<CreditTransaction>("credit-transactions")
    const creditAccounts = await readData<CreditAccount>("credit-accounts")

    // Filter transactions for this business
    const businessCreditAccounts = creditAccounts.filter((account) => account.businessId === businessId)
    const businessCreditAccountIds = businessCreditAccounts.map((account) => account.id)
    const businessTransactions = transactions.filter((transaction) =>
      businessCreditAccountIds.includes(transaction.creditAccountId),
    )

    return NextResponse.json(businessTransactions)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch credit transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { creditAccountId, type, amount, description, date } = await request.json()

    if (!creditAccountId || !type || !amount || !description || !date) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    if (!["charge", "payment"].includes(type)) {
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 })
    }

    // Get credit account and update balance
    const creditAccounts = await readData<CreditAccount>("credit-accounts")
    const creditAccount = creditAccounts.find((account) => account.id === creditAccountId)

    if (!creditAccount) {
      return NextResponse.json({ error: "Credit account not found" }, { status: 404 })
    }

    const transactionAmount = Number.parseFloat(amount)
    let newBalance = creditAccount.currentBalance

    if (type === "charge") {
      newBalance += transactionAmount
      if (newBalance > creditAccount.creditLimit) {
        return NextResponse.json({ error: "Transaction exceeds credit limit" }, { status: 400 })
      }
    } else {
      newBalance -= transactionAmount
      if (newBalance < 0) {
        return NextResponse.json({ error: "Payment exceeds current balance" }, { status: 400 })
      }
    }

    const newTransaction: CreditTransaction = {
      id: Date.now().toString(),
      creditAccountId,
      type,
      amount: transactionAmount,
      description,
      date,
      createdAt: new Date().toISOString(),
    }

    // Update credit account balance
    await updateRecord("credit-accounts", creditAccountId, { currentBalance: newBalance })

    await addRecord("credit-transactions", newTransaction)
    return NextResponse.json(newTransaction)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create credit transaction" }, { status: 500 })
  }
}
