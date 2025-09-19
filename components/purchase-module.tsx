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
import { Plus, ShoppingCart, Search, Eye, DollarSign, TrendingDown, Truck, Calendar } from "lucide-react"

interface PurchaseItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

interface PurchaseOrder {
  id: string
  businessId: string
  supplierId: string
  orderNumber: string
  date: string
  expectedDate: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  total: number
  status: "draft" | "ordered" | "received" | "paid"
  createdAt: string
}

interface Supplier {
  id: string
  businessId: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
}

interface PurchaseModuleProps {
  businessId: string
}

export function PurchaseModule({ businessId }: PurchaseModuleProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false)
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Form states
  const [newPurchase, setNewPurchase] = useState({
    orderNumber: "",
    supplierId: "",
    date: new Date().toISOString().split("T")[0],
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    tax: 0,
  })

  const [purchaseItems, setPurchaseItems] = useState<Omit<PurchaseItem, "id">[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ])

  const [newSupplier, setNewSupplier] = useState({
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
      await Promise.all([loadPurchaseOrders(), loadSuppliers()])
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPurchaseOrders = async () => {
    try {
      const response = await fetch(`/api/purchase-orders?businessId=${businessId}`)
      if (response.ok) {
        const ordersData = await response.json()
        setPurchaseOrders(ordersData)
      }
    } catch (error) {
      console.error("Failed to load purchase orders:", error)
    }
  }

  const loadSuppliers = async () => {
    try {
      const response = await fetch(`/api/suppliers?businessId=${businessId}`)
      if (response.ok) {
        const suppliersData = await response.json()
        setSuppliers(suppliersData)
      }
    } catch (error) {
      console.error("Failed to load suppliers:", error)
    }
  }

  const generateOrderNumber = () => {
    const prefix = "PO"
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}-${timestamp}`
  }

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, { description: "", quantity: 1, rate: 0, amount: 0 }])
  }

  const updatePurchaseItem = (index: number, field: keyof Omit<PurchaseItem, "id">, value: string | number) => {
    setPurchaseItems(
      purchaseItems.map((item, i) => {
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

  const removePurchaseItem = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = subtotal * (newPurchase.tax / 100)
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }

  const createPurchaseOrder = async () => {
    if (
      !newPurchase.supplierId ||
      purchaseItems.some((item) => !item.description || item.quantity <= 0 || item.rate <= 0)
    ) {
      toast({
        title: "Error",
        description: "Please select a supplier and fill in all item details.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          supplierId: newPurchase.supplierId,
          orderNumber: newPurchase.orderNumber || generateOrderNumber(),
          date: newPurchase.date,
          expectedDate: newPurchase.expectedDate,
          items: purchaseItems.filter((item) => item.description && item.quantity > 0),
          tax: calculateTotals().taxAmount,
        }),
      })

      if (response.ok) {
        const order = await response.json()
        setPurchaseOrders([...purchaseOrders, order])

        // Reset form
        setNewPurchase({
          orderNumber: "",
          supplierId: "",
          date: new Date().toISOString().split("T")[0],
          expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          tax: 0,
        })
        setPurchaseItems([{ description: "", quantity: 1, rate: 0, amount: 0 }])
        setIsPurchaseDialogOpen(false)

        toast({
          title: "Purchase Order Created",
          description: `Purchase order ${order.orderNumber} has been created successfully.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create purchase order",
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

  const createSupplier = async () => {
    if (!newSupplier.name || !newSupplier.email) {
      toast({
        title: "Error",
        description: "Please fill in the supplier name and email.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          ...newSupplier,
        }),
      })

      if (response.ok) {
        const supplier = await response.json()
        setSuppliers([...suppliers, supplier])

        setNewSupplier({ name: "", email: "", phone: "", address: "" })
        setIsSupplierDialogOpen(false)

        toast({
          title: "Supplier Added",
          description: `${supplier.name} has been added to your supplier list.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create supplier",
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

  const updatePurchaseStatus = async (orderId: string, status: PurchaseOrder["status"]) => {
    try {
      const response = await fetch(`/api/purchase-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        setPurchaseOrders(purchaseOrders.map((order) => (order.id === orderId ? updatedOrder : order)))

        toast({
          title: "Status Updated",
          description: `Purchase order status updated to ${status}.`,
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update purchase order",
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

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId)
    return supplier ? supplier.name : "Unknown Supplier"
  }

  const filteredPurchases = purchaseOrders.filter((order) => {
    const supplierName = getSupplierName(order.supplierId)
    const matchesSearch =
      supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "ordered":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "received":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "paid":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const totalSpent = purchaseOrders.filter((p) => p.status === "paid").reduce((sum, order) => sum + order.total, 0)
  const pendingOrders = purchaseOrders
    .filter((p) => p.status === "ordered")
    .reduce((sum, order) => sum + order.total, 0)
  const receivedOrders = purchaseOrders
    .filter((p) => p.status === "received")
    .reduce((sum, order) => sum + order.total, 0)

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
          <ShoppingCart className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Purchase Management</h2>
        </div>

        <div className="flex items-center space-x-2">
          <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Truck className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>Create a new supplier profile for easier purchase ordering.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Supplier Name *</Label>
                  <Input
                    id="supplier-name"
                    placeholder="Supplier name"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-email">Email *</Label>
                  <Input
                    id="supplier-email"
                    type="email"
                    placeholder="supplier@example.com"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Phone</Label>
                  <Input
                    id="supplier-phone"
                    placeholder="Phone number"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-address">Address</Label>
                  <Textarea
                    id="supplier-address"
                    placeholder="Supplier address"
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  />
                </div>
                <Button onClick={createSupplier} className="w-full">
                  Add Supplier
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
                <DialogDescription>Create a new purchase order for your supplier.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="order-number">Purchase Order Number</Label>
                    <Input
                      id="order-number"
                      placeholder="Auto-generated if empty"
                      value={newPurchase.orderNumber}
                      onChange={(e) => setNewPurchase({ ...newPurchase, orderNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-select">Supplier *</Label>
                    <Select
                      value={newPurchase.supplierId}
                      onValueChange={(value) => setNewPurchase({ ...newPurchase, supplierId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-date">Order Date</Label>
                    <Input
                      id="order-date"
                      type="date"
                      value={newPurchase.date}
                      onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected-date">Expected Delivery</Label>
                    <Input
                      id="expected-date"
                      type="date"
                      value={newPurchase.expectedDate}
                      onChange={(e) => setNewPurchase({ ...newPurchase, expectedDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Items</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addPurchaseItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {purchaseItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label htmlFor={`item-description-${index}`}>Description</Label>
                        <Input
                          id={`item-description-${index}`}
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updatePurchaseItem(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-quantity-${index}`}>Qty</Label>
                        <Input
                          id={`item-quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updatePurchaseItem(index, "quantity", Number.parseInt(e.target.value) || 0)}
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
                          onChange={(e) => updatePurchaseItem(index, "rate", Number.parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Amount</Label>
                        <div className="h-10 flex items-center font-semibold">${item.amount.toFixed(2)}</div>
                      </div>
                      <div className="col-span-1">
                        {purchaseItems.length > 1 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => removePurchaseItem(index)}>
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
                      value={newPurchase.tax}
                      onChange={(e) => setNewPurchase({ ...newPurchase, tax: Number.parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${calculateTotals().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({newPurchase.tax}%):</span>
                      <span>${calculateTotals().taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>${calculateTotals().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={createPurchaseOrder} className="w-full">
                  Create Purchase Order
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
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-slate-500">
              {purchaseOrders.filter((p) => p.status === "paid").length} paid orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <TrendingDown className="h-4 w-4 mr-2" />
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${pendingOrders.toFixed(2)}</div>
            <p className="text-xs text-slate-500">
              {purchaseOrders.filter((p) => p.status === "ordered").length} ordered items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Received Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">${receivedOrders.toFixed(2)}</div>
            <p className="text-xs text-slate-500">
              {purchaseOrders.filter((p) => p.status === "received").length} received orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <Truck className="h-4 w-4 mr-2" />
              Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-slate-500">Total suppliers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search purchases..."
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
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Purchase Orders List */}
      <div className="space-y-4">
        {filteredPurchases.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">
                No purchase orders found. Create your first purchase order to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPurchases.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{order.orderNumber}</span>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Supplier: <span className="font-medium">{getSupplierName(order.supplierId)}</span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Order Date: {order.date} • Expected: {order.expectedDate}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Items: {order.items.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${order.total.toFixed(2)}</p>
                    <div className="flex space-x-1 mt-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPurchase(order)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      {order.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => updatePurchaseStatus(order.id, "ordered")}>
                          Order
                        </Button>
                      )}
                      {order.status === "ordered" && (
                        <Button size="sm" variant="outline" onClick={() => updatePurchaseStatus(order.id, "received")}>
                          Received
                        </Button>
                      )}
                      {order.status === "received" && (
                        <Button size="sm" variant="outline" onClick={() => updatePurchaseStatus(order.id, "paid")}>
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

      {/* Purchase Details Dialog */}
      {selectedPurchase && (
        <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Purchase Order {selectedPurchase.orderNumber}</DialogTitle>
              <DialogDescription>Purchase order details and items</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Supplier</Label>
                  <p>{getSupplierName(selectedPurchase.supplierId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedPurchase.status)}>{selectedPurchase.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Order Date</Label>
                  <p>{selectedPurchase.date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expected Delivery</Label>
                  <p>{selectedPurchase.expectedDate}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedPurchase.items.map((item) => (
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
                  <span>${selectedPurchase.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${selectedPurchase.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${selectedPurchase.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
