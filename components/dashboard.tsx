"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Building2, Plus, LogOut, BarChart3, CreditCard, ShoppingCart, Receipt, BookOpen } from "lucide-react"
import { ChequebookModule } from "@/components/chequebook-module"
import { SalesModule } from "@/components/sales-module"
import { PurchaseModule } from "@/components/purchase-module"
import { CreditModule } from "@/components/credit-module"

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

interface DashboardProps {
  user: User
  businesses: Business[]
  selectedBusiness: Business | null
  onSelectBusiness: (business: Business) => void
  onCreateBusiness: (name: string, type: string, address?: string, phone?: string, email?: string) => void
  onLogout: () => void
}

export function Dashboard({
  user,
  businesses,
  selectedBusiness,
  onSelectBusiness,
  onCreateBusiness,
  onLogout,
}: DashboardProps) {
  const [newBusinessName, setNewBusinessName] = useState("")
  const [newBusinessType, setNewBusinessType] = useState("")
  const [newBusinessAddress, setNewBusinessAddress] = useState("")
  const [newBusinessPhone, setNewBusinessPhone] = useState("")
  const [newBusinessEmail, setNewBusinessEmail] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeModule, setActiveModule] = useState<string>("overview")

  const handleCreateBusiness = () => {
    if (newBusinessName.trim() && newBusinessType.trim()) {
      onCreateBusiness(
        newBusinessName.trim(),
        newBusinessType.trim(),
        newBusinessAddress.trim(),
        newBusinessPhone.trim(),
        newBusinessEmail.trim(),
      )
      setNewBusinessName("")
      setNewBusinessType("")
      setNewBusinessAddress("")
      setNewBusinessPhone("")
      setNewBusinessEmail("")
      setIsCreateDialogOpen(false)
    }
  }

  const handleBusinessSelect = (businessId: string) => {
    const business = businesses.find((b) => b.id === businessId)
    if (business) {
      onSelectBusiness(business)
      localStorage.setItem("accounting_selected_business", JSON.stringify(business))
    }
  }

  const modules = [
    { id: "overview", name: "Overview", icon: BarChart3 },
    { id: "chequebook", name: "Chequebook", icon: BookOpen },
    { id: "sales", name: "Sales", icon: Receipt },
    { id: "purchases", name: "Purchases", icon: ShoppingCart },
    { id: "credit", name: "Credit", icon: CreditCard },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">AccountingPro</h1>

              {businesses.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <Select value={selectedBusiness?.id || ""} onValueChange={handleBusinessSelect}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Business
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Business</DialogTitle>
                    <DialogDescription>Add a new business to manage its accounting separately.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="business-name">Business Name *</Label>
                      <Input
                        id="business-name"
                        placeholder="Enter business name"
                        value={newBusinessName}
                        onChange={(e) => setNewBusinessName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-type">Business Type *</Label>
                      <Select value={newBusinessType} onValueChange={setNewBusinessType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="corporation">Corporation</SelectItem>
                          <SelectItem value="llc">LLC</SelectItem>
                          <SelectItem value="nonprofit">Non-Profit</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-address">Address</Label>
                      <Textarea
                        id="business-address"
                        placeholder="Business address"
                        value={newBusinessAddress}
                        onChange={(e) => setNewBusinessAddress(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="business-phone">Phone</Label>
                        <Input
                          id="business-phone"
                          placeholder="Phone number"
                          value={newBusinessPhone}
                          onChange={(e) => setNewBusinessPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business-email">Email</Label>
                        <Input
                          id="business-email"
                          type="email"
                          placeholder="Business email"
                          value={newBusinessEmail}
                          onChange={(e) => setNewBusinessEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateBusiness} className="w-full">
                      Create Business
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <span className="text-sm text-slate-600 dark:text-slate-400">Welcome, {user.name}</span>

              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedBusiness ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No Business Selected</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Create or select a business to start managing your accounting.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Business
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>{selectedBusiness.name}</span>
                </CardTitle>
                <CardDescription>
                  {selectedBusiness.type} • {selectedBusiness.address && `${selectedBusiness.address} • `}
                  {selectedBusiness.phone && `${selectedBusiness.phone} • `}
                  {selectedBusiness.email}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Navigation */}
            <div className="flex space-x-1 bg-white dark:bg-slate-800 p-1 rounded-lg border">
              {modules.map((module) => {
                const Icon = module.icon
                return (
                  <Button
                    key={module.id}
                    variant={activeModule === module.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveModule(module.id)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{module.name}</span>
                  </Button>
                )
              })}
            </div>

            {/* Module Content */}
            <div className="min-h-96">
              {activeModule === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Sales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-slate-500">No sales recorded</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Purchases
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-slate-500">No purchases recorded</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Outstanding Credit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-slate-500">No credit transactions</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Cheque Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                      <p className="text-xs text-slate-500">No chequebook setup</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeModule === "chequebook" && <ChequebookModule businessId={selectedBusiness.id} />}

              {activeModule === "sales" && <SalesModule businessId={selectedBusiness.id} />}

              {activeModule === "purchases" && <PurchaseModule businessId={selectedBusiness.id} />}

              {activeModule === "credit" && <CreditModule businessId={selectedBusiness.id} />}

              {activeModule !== "overview" &&
                activeModule !== "chequebook" &&
                activeModule !== "sales" &&
                activeModule !== "purchases" &&
                activeModule !== "credit" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{modules.find((m) => m.id === activeModule)?.name} Module</CardTitle>
                      <CardDescription>This module will be implemented in the next steps.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-500">Coming soon: Full {activeModule} management functionality.</p>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
