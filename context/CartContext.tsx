"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface CartItem {
  cartItemId: string   // `${productId}-${formatName}` — unique per product+format combo
  productId: number
  productName: string
  roasterId: string | null
  roasterName: string
  format: { name: string; grams: number; price: number }
  price: number        // mirrors format.price for convenience
  quantity: number
  batchId?: string     // set for Café Roaster pre-orders
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, qty: number) => void
  clearCart: () => void
  totalCount: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [initialized, setInitialized] = useState(false)

  // Hydrate from localStorage once on mount.
  // Drop any items that pre-date the productId field — they'd hit "Invalid productId: undefined"
  // at checkout. Valid items from the same cart are preserved.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("kohi-cart")
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored)
        setItems(parsed.filter(i => typeof i.productId === "number"))
      }
    } catch {}
    setInitialized(true)
  }, [])

  // Persist on every change, but only after hydration so we don't overwrite with []
  useEffect(() => {
    if (initialized) {
      localStorage.setItem("kohi-cart", JSON.stringify(items))
    }
  }, [items, initialized])

  function addItem(item: Omit<CartItem, "quantity">) {
    setItems(prev => {
      const existing = prev.find(i => i.cartItemId === item.cartItemId)
      if (existing) {
        return prev.map(i =>
          i.cartItemId === item.cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function removeItem(cartItemId: string) {
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId))
  }

  function updateQuantity(cartItemId: string, qty: number) {
    if (qty <= 0) {
      removeItem(cartItemId)
      return
    }
    setItems(prev =>
      prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: qty } : i)
    )
  }

  function clearCart() {
    setItems([])
    try { localStorage.removeItem("kohi-cart") } catch {}
  }

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalCount, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
