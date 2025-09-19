import { type NextRequest, NextResponse } from "next/server"
import { addRecord, readData } from "@/lib/data-store"
import type { User } from "@/lib/types"
import { sign } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 })
    }

    const users = await readData<User>("users")
    const existingUser = users.find((u) => u.email === email)

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      password, // In production, hash this!
      name,
      createdAt: new Date().toISOString(),
    }

    await addRecord("users", newUser)

    const token = sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "7d" })

    const response = NextResponse.json({
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      token,
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
