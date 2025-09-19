import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData, updateRecord } from "@/lib/data-store"
import type { Cheque, BankAccount } from "@/lib/types"
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
    const cheques = await readData<Cheque>("cheques")
    const bankAccounts = await readData<BankAccount>("bank-accounts")

    // Filter cheques for this business
    const businessBankAccounts = bankAccounts.filter((account) => account.businessId === businessId)
    const businessBankAccountIds = businessBankAccounts.map((account) => account.id)
    const businessCheques = cheques.filter((cheque) => businessBankAccountIds.includes(cheque.bankAccountId))

    return NextResponse.json(businessCheques)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cheques" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { bankAccountId, chequeNumber, payee, amount, date, memo } = await request.json()

    if (!bankAccountId || !chequeNumber || !payee || !amount || !date) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Check if bank account has sufficient balance
    const bankAccounts = await readData<BankAccount>("bank-accounts")
    const bankAccount = bankAccounts.find((account) => account.id === bankAccountId)

    if (!bankAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 })
    }

    if (bankAccount.balance < Number.parseFloat(amount)) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    const newCheque: Cheque = {
      id: Date.now().toString(),
      bankAccountId,
      chequeNumber,
      payee,
      amount: Number.parseFloat(amount),
      date,
      memo: memo || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    // Deduct amount from bank account
    await updateRecord("bank-accounts", bankAccountId, {
      balance: bankAccount.balance - Number.parseFloat(amount),
    })

    await addRecord("cheques", newCheque)
    return NextResponse.json(newCheque)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create cheque" }, { status: 500 })
  }
}
