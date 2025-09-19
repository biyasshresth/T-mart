"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Plus, CreditCard, Search, Eye, DollarSign, TrendingUp, Users, AlertCircle } from "lucide-react"

interface CreditTransaction {
  id: string
  creditAccountId: string
  type: "charge" | "payment"
  amount: number
  description: string
  date: string
  createdAt: string
}

interface CreditAccount {
  id: string
  businessId: string
  accountName: string
  creditLimit: number
  currentBalance: number
  interestRate: number
  createdAt: string
}

interface CreditModuleProps {
  businessId: string
}

export function CreditModule({ businessId }: CreditModuleProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([])
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Form states
  const [newTransaction, setNewTransaction] = useState({
    creditAccountId: "",
    type: "charge" as CreditTransaction["type"],
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  const [newAccount, setNewAccount] = useState({
    accountName: "",
    creditLimit: 0,
    interestRate: 0,
  })

  useEffect(() => {
    loadData()
  }, [businessId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([loadCreditAccounts(), loadTransactions()])
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCreditAccounts = async () => {
    try {
      const response = await fetch(`/api/credit-accounts?businessId=${businessId}`)
      if (response.ok) {
        const accountsData = await response.json()
        setCreditAccounts(accountsData)
      }
    } catch (error) {
      console.error("Failed to load credit accounts:", error)
    }
  }

  const loadTransactions = async () => {
    try {
      const response = await fetch(`/api/credit-transactions?businessId=${businessId}`)
      if (response.ok) {
        const transactionsData = await response.json()
        setTransactions(transactionsData)
      }
    } catch (error) {
      console.error("Failed to load credit transactions:", error)
    }
  }

  const createTransaction = async () => {
    if (!newTransaction.creditAccountId || !newTransaction.description || newTransaction.amount <= 0) {
      toast({
        title: "Error",
        description: "Please select an account, fill in description, and ensure amount is greater than 0.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/credit-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransaction),
      })

      if (response.ok) {
        const transaction = await response.json()
        setTransactions([...transactions, transaction])

        // Update account balance locally
        const updatedAccounts = creditAccounts.map((acc) => {
          if (acc.id === newTransaction.creditAccountId) {
            const balanceChange = newTransaction.type === "charge" ? newTransaction.amount : -newTransaction.amount
            return { ...acc, currentBalance: acc.currentBalance + balanceChange }
          }
          return acc
        })
        setCreditAccounts(updatedAccounts)

        // Reset form
        setNewTransaction({
          creditAccountId: "",
          type: "charge",
          amount: 0,
          description: "",
          date: new Date().toISOString().split("T")[0],
        })
        setIsTransactionDialogOpen(false)

        toast({
          title: "Transaction Created",
          description: `Credit transaction has been created successfully.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create transaction",
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

  const createCreditAccount = async () => {
    if (!newAccount.accountName || newAccount.creditLimit <= 0) {
      toast({
        title: "Error",
        description: "Please fill in the account name and set a credit limit.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/credit-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          ...newAccount,
        }),
      })

      if (response.ok) {
        const account = await response.json()
        setCreditAccounts([...creditAccounts, account])

        setNewAccount({ accountName: "", creditLimit: 0, interestRate: 0 })
        setIsAccountDialogOpen(false)

        toast({
          title: "Credit Account Created",
          description: `Credit account ${account.accountName} has been created.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create credit account",
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

  const getAccountName = (accountId: string) => {
    const account = creditAccounts.find((acc) => acc.id === accountId)
    return account ? account.accountName : "Unknown Account"
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const accountName = getAccountName(transaction.creditAccountId)
    const matchesSearch =
      accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || transaction.type === typeFilter
    return matchesSearch && matchesType
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case "charge":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "payment":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatTransactionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const totalCharges = transactions.filter((t) => t.type === "charge").reduce((sum, t) => sum + t.amount, 0)
  const totalPayments = transactions.filter((t) => t.type === "payment").reduce((sum, t) => sum + t.amount, 0)
  const totalBalance = creditAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0)
  const totalCreditLimit = creditAccounts.reduce((sum, acc) => sum + acc.creditLimit, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <CreditCard className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Credit Management</h2>
        </div>

        <div className="flex items-center space-x-2">
          <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Add Credit Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Credit Account</DialogTitle>
                <DialogDescription>Set up a new credit account for your business.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name *</Label>
                  <Input
                    id="account-name"
                    placeholder="e.g., Business Credit Line"
                    value={newAccount.accountName}
                    onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit-limit">Credit Limit *</Label>
                  <Input
                    id="credit-limit"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newAccount.creditLimit}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, creditLimit: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <Input
                    id="interest-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={newAccount.interestRate}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, interestRate: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <Button onClick={createCreditAccount} className="w-full">
                  Create Credit Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Credit Transaction</DialogTitle>
                <DialogDescription>Record a new credit transaction.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credit-account">Credit Account *</Label>
                    <Select
                      value={newTransaction.creditAccountId}
                      onValueChange={(value) => setNewTransaction({ ...newTransaction, creditAccountId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select credit account" />
                      </SelectTrigger>
                      <SelectContent>
                        {creditAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transaction-type">Transaction Type *</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(value: CreditTransaction["type"]) =>
                        setNewTransaction({ ...newTransaction, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="charge">Charge</SelectItem>
                        <SelectItem value="payment">Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newTransaction.amount}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, amount: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Transaction description"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-date">Transaction Date</Label>
                  <Input
                    id="transaction-date"
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  />
                </div>

                <Button onClick={createTransaction} className="w-full">
                  Create Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">${totalCharges.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Total charges made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">${totalPayments.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Total payments made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Outstanding balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Credit Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCreditLimit.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Total available credit</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Accounts */}
      {creditAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Credit Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creditAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold">{account.accountName}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Interest Rate: {account.interestRate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">Balance: ${account.currentBalance.toFixed(2)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Limit: ${account.creditLimit.toFixed(2)}
                    </p>
                    {account.currentBalance > account.creditLimit && (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Over Limit</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="charge">Charges</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">
                No credit transactions found. Create your first transaction to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{getAccountName(transaction.creditAccountId)}</span>
                      <Badge className={getTypeColor(transaction.type)}>
                        {formatTransactionType(transaction.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Date: {transaction.date}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{transaction.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${transaction.amount.toFixed(2)}</p>
                    <div className="flex space-x-1 mt-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedTransaction(transaction)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Transaction Details Dialog */}
      {selectedTransaction && (
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Credit Transaction Details</DialogTitle>
              <DialogDescription>Transaction information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Account</Label>
                  <p>{getAccountName(selectedTransaction.creditAccountId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="mt-1">
                    <Badge className={getTypeColor(selectedTransaction.type)}>
                      {formatTransactionType(selectedTransaction.type)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Transaction Date</Label>
                  <p>{selectedTransaction.date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-xl font-bold">${selectedTransaction.amount.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedTransaction.description}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
