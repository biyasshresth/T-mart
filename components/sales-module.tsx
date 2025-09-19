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
import { Plus, Receipt, Search, Eye, DollarSign, TrendingUp, Users, Calendar } from "lucide-react"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Invoice {
  id: string
  businessId: string
  customerId: string
  invoiceNumber: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  status: "draft" | "sent" | "paid" | "overdue"
  createdAt: string
}

interface Customer {
  id: string
  businessId: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
}

interface SalesModuleProps {
  businessId: string
}

export function SalesModule({ businessId }: SalesModuleProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Form states
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: "",
    customerId: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    tax: 0,
  })

  const [invoiceItems, setInvoiceItems] = useState<Omit<InvoiceItem, "id">[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ])

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    loadData()
  }, [businessId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([loadInvoices(), loadCustomers()])
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices?businessId=${businessId}`)
      if (response.ok) {
        const invoicesData = await response.json()
        setInvoices(invoicesData)
      }
    } catch (error) {
      console.error("Failed to load invoices:", error)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await fetch(`/api/customers?businessId=${businessId}`)
      if (response.ok) {
        const customersData = await response.json()
        setCustomers(customersData)
      }
    } catch (error) {
      console.error("Failed to load customers:", error)
    }
  }

  const generateInvoiceNumber = () => {
    const prefix = "INV"
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}-${timestamp}`
  }

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: "", quantity: 1, rate: 0, amount: 0 }])
  }

  const updateInvoiceItem = (index: number, field: keyof Omit<InvoiceItem, "id">, value: string | number) => {
    setInvoiceItems(
      invoiceItems.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }
          if (field === "quantity" || field === "rate") {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate
          }
          return updatedItem
        }
        return item
      }),
    )
  }

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = subtotal * (newInvoice.tax / 100)
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }

  const createInvoice = async () => {
    if (
      !newInvoice.customerId ||
      invoiceItems.some((item) => !item.description || item.quantity <= 0 || item.rate <= 0)
    ) {
      toast({
        title: "Error",
        description: "Please select a customer and fill in all item details.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          customerId: newInvoice.customerId,
          invoiceNumber: newInvoice.invoiceNumber || generateInvoiceNumber(),
          date: newInvoice.date,
          dueDate: newInvoice.dueDate,
          items: invoiceItems.filter((item) => item.description && item.quantity > 0),
          tax: calculateTotals().taxAmount,
        }),
      })

      if (response.ok) {
        const invoice = await response.json()
        setInvoices([...invoices, invoice])

        // Reset form
        setNewInvoice({
          invoiceNumber: "",
          customerId: "",
          date: new Date().toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          tax: 0,
        })
        setInvoiceItems([{ description: "", quantity: 1, rate: 0, amount: 0 }])
        setIsInvoiceDialogOpen(false)

        toast({
          title: "Invoice Created",
          description: `Invoice ${invoice.invoiceNumber} has been created successfully.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create invoice",
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

  const createCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast({
        title: "Error",
        description: "Please fill in the customer name and email.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          ...newCustomer,
        }),
      })

      if (response.ok) {
        const customer = await response.json()
        setCustomers([...customers, customer])

        setNewCustomer({ name: "", email: "", phone: "", address: "" })
        setIsCustomerDialogOpen(false)

        toast({
          title: "Customer Added",
          description: `${customer.name} has been added to your customer list.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create customer",
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

  const updateInvoiceStatus = async (invoiceId: string, status: Invoice["status"]) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        const updatedInvoice = await response.json()
        setInvoices(invoices.map((invoice) => (invoice.id === invoiceId ? updatedInvoice : invoice)))

        toast({
          title: "Status Updated",
          description: `Invoice status updated to ${status}.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update invoice",
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

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer ? customer.name : "Unknown Customer"
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const customerName = getCustomerName(invoice.customerId)
    const matchesSearch =
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, invoice) => sum + invoice.total, 0)
  const pendingRevenue = invoices.filter((i) => i.status === "sent").reduce((sum, invoice) => sum + invoice.total, 0)
  const overdueRevenue = invoices.filter((i) => i.status === "overdue").reduce((sum, invoice) => sum + invoice.total, 0)

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
          <Receipt className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Sales Management</h2>
        </div>

        <div className="flex items-center space-x-2">
          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>Create a new customer profile for easier invoicing.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name *</Label>
                  <Input
                    id="customer-name"
                    placeholder="Customer name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email *</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="customer@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone</Label>
                  <Input
                    id="customer-phone"
                    placeholder="Phone number"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-address">Address</Label>
                  <Textarea
                    id="customer-address"
                    placeholder="Customer address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  />
                </div>
                <Button onClick={createCustomer} className="w-full">
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Create a new sales invoice for your customer.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Invoice Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-number">Invoice Number</Label>
                    <Input
                      id="invoice-number"
                      placeholder="Auto-generated if empty"
                      value={newInvoice.invoiceNumber}
                      onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-select">Customer *</Label>
                    <Select
                      value={newInvoice.customerId}
                      onValueChange={(value) => setNewInvoice({ ...newInvoice, customerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice-date">Invoice Date</Label>
                    <Input
                      id="invoice-date"
                      type="date"
                      value={newInvoice.date}
                      onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Due Date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {invoiceItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label htmlFor={`item-description-${index}`}>Description</Label>
                        <Input
                          id={`item-description-${index}`}
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-quantity-${index}`}>Qty</Label>
                        <Input
                          id={`item-quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, "quantity", Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-rate-${index}`}>Rate</Label>
                        <Input
                          id={`item-rate-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={(e) => updateInvoiceItem(index, "rate", Number.parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Amount</Label>
                        <div className="h-10 flex items-center font-semibold">${item.amount.toFixed(2)}</div>
                      </div>
                      <div className="col-span-1">
                        {invoiceItems.length > 1 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => removeInvoiceItem(index)}>
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newInvoice.tax}
                      onChange={(e) => setNewInvoice({ ...newInvoice, tax: Number.parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${calculateTotals().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({newInvoice.tax}%):</span>
                      <span>${calculateTotals().taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>${calculateTotals().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={createInvoice} className="w-full">
                  Create Invoice
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
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-slate-500">{invoices.filter((i) => i.status === "paid").length} paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Pending Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${pendingRevenue.toFixed(2)}</div>
            <p className="text-xs text-slate-500">{invoices.filter((i) => i.status === "sent").length} sent invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">${overdueRevenue.toFixed(2)}</div>
            <p className="text-xs text-slate-500">
              {invoices.filter((i) => i.status === "overdue").length} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-slate-500">Total customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Receipt className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No invoices found. Create your first invoice to get started.</p>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{invoice.invoiceNumber}</span>
                      <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Customer: <span className="font-medium">{getCustomerName(invoice.customerId)}</span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Date: {invoice.date} • Due: {invoice.dueDate}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Items: {invoice.items.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${invoice.total.toFixed(2)}</p>
                    <div className="flex space-x-1 mt-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(invoice)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      {invoice.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => updateInvoiceStatus(invoice.id, "sent")}>
                          Send
                        </Button>
                      )}
                      {invoice.status === "sent" && (
                        <Button size="sm" variant="outline" onClick={() => updateInvoiceStatus(invoice.id, "paid")}>
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice {selectedInvoice.invoiceNumber}</DialogTitle>
              <DialogDescription>Invoice details and items</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p>{getCustomerName(selectedInvoice.customerId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p>{selectedInvoice.date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p>{selectedInvoice.dueDate}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedInvoice.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded"
                    >
                      <div>
                        <span className="font-medium">{item.description}</span>
                        <span className="text-sm text-slate-500 ml-2">
                          {item.quantity} × ${item.rate.toFixed(2)}
                        </span>
                      </div>
                      <span className="font-semibold">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${selectedInvoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
