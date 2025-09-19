"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Dashboard } from "@/components/dashboard"

interface User {
  id: string
  email: string
  name: string
}

interface Business {
  id: string
  name: string
  type: string
  address: string
  phone: string
  email: string
  userId: string
  createdAt: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
        await loadBusinesses()
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBusinesses = async () => {
    try {
      const response = await fetch("/api/businesses")
      if (response.ok) {
        const businessData = await response.json()
        setBusinesses(businessData)

        // Set first business as selected if none selected
        if (businessData.length > 0 && !selectedBusiness) {
          setSelectedBusiness(businessData[0])
        }
      }
    } catch (error) {
      console.error("Failed to load businesses:", error)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        await loadBusinesses()
        toast({
          title: "Login Successful",
          description: "Welcome to your accounting dashboard!",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Login Failed",
          description: error.error || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  const handleRegister = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        await loadBusinesses()
        toast({
          title: "Registration Successful",
          description: "Your account has been created!",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Registration Failed",
          description: error.error || "Registration failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Registration Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      setBusinesses([])
      setSelectedBusiness(null)
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const createBusiness = async (name: string, type: string, address = "", phone = "", email = "") => {
    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, address, phone, email }),
      })

      if (response.ok) {
        const newBusiness = await response.json()
        const updatedBusinesses = [...businesses, newBusiness]
        setBusinesses(updatedBusinesses)

        if (!selectedBusiness) {
          setSelectedBusiness(newBusiness)
        }

        toast({
          title: "Business Created",
          description: `${name} has been added to your account.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Creation Failed",
          description: error.error || "Failed to create business",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Creation Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onLogin={handleLogin} onRegister={handleRegister} />
  }

  return (
    <Dashboard
      user={user}
      businesses={businesses}
      selectedBusiness={selectedBusiness}
      onSelectBusiness={setSelectedBusiness}
      onCreateBusiness={createBusiness}
      onLogout={handleLogout}
    />
  )
}

function AuthForm({
  onLogin,
  onRegister,
}: {
  onLogin: (email: string, password: string) => void
  onRegister: (email: string, password: string, name: string) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">AccountingPro</CardTitle>
          <CardDescription>Professional accounting management for your business</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={() => onLogin(email, password)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
              >
                Login
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <Input
                  id="register-name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={() => onRegister(email, password, name)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
              >
                Create Account
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
