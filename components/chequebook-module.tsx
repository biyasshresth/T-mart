"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, BookOpen, Check, X, Search } from "lucide-react"

interface Cheque {
  id: string
  bankAccountId: string
  chequeNumber: string
  payee: string
  amount: number
  date: string
  memo: string
  status: "pending" | "cleared" | "cancelled"
  createdAt: string
}

interface BankAccount {
  id: string
  businessId: string
  bankName: string
  accountNumber: string
  accountType: string
  balance: number
  createdAt: string
}

interface ChequebookModuleProps {
  businessId: string
}

export function ChequebookModule({ businessId }: ChequebookModuleProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isChequeDialogOpen, setIsChequeDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Form states
  const [newAccount, setNewAccount] = useState({
    bankName: "",
    accountNumber: "",
    accountType: "",
    balance: 0,
  })

  const [newCheque, setNewCheque] = useState({
    chequeNumber: "",
    amount: 0,
    payee: "",
    date: new Date().toISOString().split("T")[0],
    memo: "",
  })

  useEffect(() => {
    loadData()
  }, [businessId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([loadAccounts(), loadCheques()])
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await fetch(`/api/bank-accounts?businessId=${businessId}`)
      if (response.ok) {
        const accountsData = await response.json()
        setAccounts(accountsData)
        if (accountsData.length > 0 && !selectedAccount) {
          setSelectedAccount(accountsData[0])
        }
      }
    } catch (error) {
      console.error("Failed to load accounts:", error)
    }
  }

  const loadCheques = async () => {
    try {
      const response = await fetch(`/api/cheques?businessId=${businessId}`)
      if (response.ok) {
        const chequesData = await response.json()
        setCheques(chequesData)
      }
    } catch (error) {
      console.error("Failed to load cheques:", error)
    }
  }

  const createAccount = async () => {
    if (!newAccount.bankName || !newAccount.accountNumber || !newAccount.accountType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          ...newAccount,
        }),
      })

      if (response.ok) {
        const account = await response.json()
        const updatedAccounts = [...accounts, account]
        setAccounts(updatedAccounts)

        if (!selectedAccount) {
          setSelectedAccount(account)
        }

        setNewAccount({ bankName: "", accountNumber: "", accountType: "", balance: 0 })
        setIsAccountDialogOpen(false)

        toast({
          title: "Account Created",
          description: `${account.bankName} account has been added successfully.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create account",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  const createCheque = async () => {
    if (!selectedAccount || !newCheque.chequeNumber || !newCheque.payee || newCheque.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and ensure amount is greater than 0.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: selectedAccount.id,
          ...newCheque,
        }),
      })

      if (response.ok) {
        const cheque = await response.json()
        setCheques([...cheques, cheque])

        // Update account balance locally
        const updatedAccounts = accounts.map((acc) =>
          acc.id === selectedAccount.id ? { ...acc, balance: acc.balance - newCheque.amount } : acc,
        )
        setAccounts(updatedAccounts)
        setSelectedAccount({ ...selectedAccount, balance: selectedAccount.balance - newCheque.amount })

        setNewCheque({
          chequeNumber: "",
          amount: 0,
          payee: "",
          date: new Date().toISOString().split("T")[0],
          memo: "",
        })
        setIsChequeDialogOpen(false)

        toast({
          title: "Cheque Created",
          description: `Cheque #${cheque.chequeNumber} for $${cheque.amount} has been issued.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create cheque",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  const updateChequeStatus = async (chequeId: string, status: "cleared" | "cancelled") => {
    try {
      const response = await fetch(`/api/cheques/${chequeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        const updatedCheque = await response.json()
        setCheques(cheques.map((cheque) => (cheque.id === chequeId ? updatedCheque : cheque)))

        // If cancelling, update account balance locally
        if (status === "cancelled" && selectedAccount) {
          const cheque = cheques.find((c) => c.id === chequeId)
          if (cheque && cheque.status === "pending") {
            const updatedAccounts = accounts.map((acc) =>
              acc.id === selectedAccount.id ? { ...acc, balance: acc.balance + cheque.amount } : acc,
            )
            setAccounts(updatedAccounts)
            setSelectedAccount({ ...selectedAccount, balance: selectedAccount.balance + cheque.amount })
          }
        }

        toast({
          title: "Cheque Updated",
          description: `Cheque status updated to ${status}.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update cheque",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive",
      })
    }
  }

  const filteredCheques = cheques.filter(
    (cheque) =>
      cheque.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cheque.chequeNumber.includes(searchTerm) ||
      cheque.memo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "cleared":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Selection and Creation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <BookOpen className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Chequebook Management</h2>
        </div>

        <div className="flex items-center space-x-2">
          {accounts.length > 0 && (
            <Select
              value={selectedAccount?.id || ""}
              onValueChange={(value) => {
                const account = accounts.find((acc) => acc.id === value)
                if (account) setSelectedAccount(account)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bankName} - {account.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Bank Account</DialogTitle>
                <DialogDescription>Add a new bank account for chequebook management.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    placeholder="Bank name"
                    value={newAccount.bankName}
                    onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-number">Account Number</Label>
                  <Input
                    id="account-number"
                    placeholder="Account number"
                    value={newAccount.accountNumber}
                    onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-type">Account Type</Label>
                  <Select
                    value={newAccount.accountType}
                    onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial-balance">Initial Balance</Label>
                  <Input
                    id="initial-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount({ ...newAccount, balance: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button onClick={createAccount} className="w-full">
                  Create Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedAccount ? (
        <Card>
          <CardHeader>
            <CardTitle>No Bank Account</CardTitle>
            <CardDescription>Create a bank account to start managing your chequebook.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsAccountDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Bank Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Account Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>
                  {selectedAccount.bankName} - {selectedAccount.accountType}
                </span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${selectedAccount.balance.toFixed(2)}
                </span>
              </CardTitle>
              <CardDescription>Account: {selectedAccount.accountNumber}</CardDescription>
            </CardHeader>
          </Card>

          {/* Cheque Management */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search cheques..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Dialog open={isChequeDialogOpen} onOpenChange={setIsChequeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Write Cheque
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Write New Cheque</DialogTitle>
                  <DialogDescription>Create a new cheque for {selectedAccount.bankName}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cheque-number">Cheque Number</Label>
                    <Input
                      id="cheque-number"
                      placeholder="Cheque number"
                      value={newCheque.chequeNumber}
                      onChange={(e) => setNewCheque({ ...newCheque, chequeNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payee">Pay To</Label>
                    <Input
                      id="payee"
                      placeholder="Payee name"
                      value={newCheque.payee}
                      onChange={(e) => setNewCheque({ ...newCheque, payee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newCheque.amount}
                      onChange={(e) => setNewCheque({ ...newCheque, amount: Number.parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newCheque.date}
                      onChange={(e) => setNewCheque({ ...newCheque, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memo">Memo</Label>
                    <Input
                      id="memo"
                      placeholder="Optional memo"
                      value={newCheque.memo}
                      onChange={(e) => setNewCheque({ ...newCheque, memo: e.target.value })}
                    />
                  </div>
                  <Button onClick={createCheque} className="w-full">
                    Write Cheque
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Cheques List */}
          <div className="space-y-4">
            {filteredCheques.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No cheques found. Write your first cheque to get started.</p>
                </CardContent>
              </Card>
            ) : (
              filteredCheques.map((cheque) => (
                <Card key={cheque.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">Cheque #{cheque.chequeNumber}</span>
                          <Badge className={getStatusColor(cheque.status)}>{cheque.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Pay to: <span className="font-medium">{cheque.payee}</span>
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Date: {cheque.date}</p>
                        {cheque.memo && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">Memo: {cheque.memo}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${cheque.amount.toFixed(2)}</p>
                        {cheque.status === "pending" && (
                          <div className="flex space-x-1 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateChequeStatus(cheque.id, "cleared")}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateChequeStatus(cheque.id, "cancelled")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
