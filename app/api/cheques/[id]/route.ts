import { type NextRequest, NextResponse } from "next/server"
import { updateRecord, readData } from "@/lib/data-store"
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserFromToken(request)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { status } = await request.json()
    const chequeId = params.id

    if (!status || !["pending", "cleared", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const cheques = await readData<Cheque>("cheques")
    const cheque = cheques.find((c) => c.id === chequeId)

    if (!cheque) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 })
    }

    // If cancelling a cheque, restore the balance
    if (status === "cancelled" && cheque.status !== "cancelled") {
      const bankAccounts = await readData<BankAccount>("bank-accounts")
      const bankAccount = bankAccounts.find((account) => account.id === cheque.bankAccountId)

      if (bankAccount) {
        await updateRecord("bank-accounts", cheque.bankAccountId, {
          balance: bankAccount.balance + cheque.amount,
        })
      }
    }

    const updatedCheque = await updateRecord("cheques", chequeId, { status })
    return NextResponse.json(updatedCheque)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update cheque" }, { status: 500 })
  }
}
