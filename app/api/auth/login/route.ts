import { type NextRequest, NextResponse } from "next/server"
import { readData } from "@/lib/data-store"
import type { User } from "@/lib/types"
import { sign } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const users = await readData<User>("users")
    const user = users.find((u) => u.email === email && u.password === password)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" })

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
