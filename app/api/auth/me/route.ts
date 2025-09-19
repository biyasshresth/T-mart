import { type NextRequest, NextResponse } from "next/server"
import { readData } from "@/lib/data-store"
import type { User } from "@/lib/types"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 })
  }

  try {
    const decoded = verify(token, JWT_SECRET) as { userId: string }
    const users = await readData<User>("users")
    const user = users.find((u) => u.id === decoded.userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }
}
