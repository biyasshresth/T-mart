import { type NextRequest, NextResponse } from "next/server"
import { updateRecord } from "@/lib/data-store"
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
    const invoiceId = params.id

    if (!status || !["draft", "sent", "paid", "overdue"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const updatedInvoice = await updateRecord("invoices", invoiceId, { status })

    if (!updatedInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }
}
