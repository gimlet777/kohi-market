"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { ProductRow } from "@/lib/products"

interface RoasterProfile {
  roaster_name: string
  email: string
  region: string
  seller_type: string
}

interface OrderItem {
  productName: string
  formatName: string
  grams: number
  unitPrice: number
  quantity: number
}

interface Order {
  id: string
  buyer_name: string
  buyer_email: string
  shipping_address: Record<string, string> | null
  items: OrderItem[]
  total_amount: number
  status: "pending" | "shipped" | "delivered"
  stripe_session_id: string
  created_at: string
}

const COMING_SOON_CARDS = [
  {
    title: "Batch Schedule",
    description: "Set your upcoming roast dates and manage pre-order availability.",
    icon: "📅",
  },
  {
    title: "Analytics",
    description: "Track views, favourites, and sales performance across your listings.",
    icon: "📊",
  },
]

function roastBadge(level: string) {
  const map: Record<string, string> = {
    Light: "bg-amber-50 text-amber-700 border-amber-100",
    Medium: "bg-orange-50 text-orange-700 border-orange-100",
    Dark: "bg-stone-100 text-stone-700 border-stone-200",
  }
  return map[level] ?? "bg-stone-100 text-stone-500 border-stone-200"
}

function statusBadge(status: Order["status"]) {
  const map: Record<Order["status"], string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    shipped: "bg-blue-50 text-blue-700 border-blue-100",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }
  return map[status]
}

function priceDisplay(product: ProductRow) {
  if (product.formats?.length) {
    const prices = product.formats.map(f => f.price)
    const min = Math.min(...prices)
    return prices.length > 1
      ? `From ¥${min.toLocaleString()}`
      : `¥${min.toLocaleString()}`
  }
  return `¥${product.price?.toLocaleString() ?? "—"}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<RoasterProfile | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmShipOrderId, setConfirmShipOrderId] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/roaster/login")
        return
      }

      const [
        { data: profileData, error: profileError },
        { data: productsData, error: productsError },
        { data: ordersData, error: ordersError },
      ] = await Promise.all([
        supabase
          .from("roasters")
          .select("roaster_name, email, region, seller_type")
          .eq("id", session.user.id)
          .single(),
        supabase
          .from("products")
          .select("*")
          .eq("roaster_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .eq("roaster_id", session.user.id)
          .order("created_at", { ascending: false }),
      ])

      if (profileError) console.error("Profile fetch error:", profileError)
      if (productsError) {
        console.error("Products fetch error:", productsError)
        setFetchError(productsError.message)
      }
      if (ordersError) console.error("Orders fetch error:", ordersError)

      setProfile(profileData)
      setProducts(productsData ?? [])
      setOrders((ordersData ?? []) as Order[])
      setIsLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/roaster/login")
  }

  async function handleDelete(id: number) {
    setDeleteError(null)
    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) {
      setDeleteError(error.message)
    } else {
      setProducts(prev => prev.filter(p => p.id !== id))
      setConfirmDeleteId(null)
    }
  }

  async function handleUpdateStatus(orderId: string, status: Order["status"]) {
    setUpdatingOrderId(orderId)
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } else {
      console.error("Order status update error:", error)
    }
    setUpdatingOrderId(null)
    setConfirmShipOrderId(null)
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex flex-col">

      {/* Nav */}
      <nav className="bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-[#C8965A] tracking-wide">
          KOHĪ
        </Link>
        <div className="flex items-center gap-6">
          <span className="text-xs text-stone-500 tracking-widest uppercase">Roaster Portal</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs text-stone-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-[#34150F] px-6 md:px-10 py-12 md:py-16">
        {isLoading ? (
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-9 w-64 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-48 bg-white/10 rounded animate-pulse mt-2" />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-widest uppercase text-stone-500 mb-2">Dashboard</p>
            <h1 className="font-serif text-3xl md:text-4xl text-white mb-1">
              Welcome back,{" "}
              <span className="text-[#C8965A]">{profile?.roaster_name ?? "Roaster"}</span>
            </h1>
            <p className="text-sm text-stone-400">
              {profile?.seller_type} · {profile?.region}
            </p>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-5xl mx-auto w-full space-y-10">

        {/* Profile card */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm animate-pulse">
            <div className="h-4 w-24 bg-stone-100 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-3 w-48 bg-stone-100 rounded" />
              <div className="h-3 w-36 bg-stone-100 rounded" />
              <div className="h-3 w-32 bg-stone-100 rounded" />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-xs tracking-widest uppercase text-stone-400 mb-4">Your Profile</h2>
            <dl className="space-y-2">
              {[
                ["Roaster name", profile?.roaster_name],
                ["Email", profile?.email],
                ["Region", profile?.region],
                ["Seller type", profile?.seller_type],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4 text-sm">
                  <dt className="w-28 text-stone-400 shrink-0">{label}</dt>
                  <dd className="text-[#34150F] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs tracking-widest uppercase text-stone-400">Orders</h2>
            {orders.length > 0 && (
              <span className="text-xs text-stone-400">
                {orders.filter(o => o.status === "pending").length} pending
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-4 px-6 py-5 border-b border-stone-100 last:border-0 animate-pulse">
                  <div className="h-4 flex-1 bg-stone-100 rounded" />
                  <div className="h-4 w-24 bg-stone-100 rounded" />
                  <div className="h-4 w-20 bg-stone-100 rounded" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 shadow-sm text-center">
              <p className="text-sm text-stone-400 mb-1">No orders yet</p>
              <p className="text-xs text-stone-300">Orders will appear here when customers purchase your coffee.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-6 py-3">Date</th>
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Buyer</th>
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Items</th>
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Total</th>
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 text-stone-500 whitespace-nowrap text-xs">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-[#34150F] font-medium text-sm">{order.buyer_name}</p>
                          <p className="text-stone-400 text-xs">{order.buyer_email}</p>
                        </td>
                        <td className="px-4 py-4 min-w-[180px]">
                          {order.items.map((item, i) => (
                            <p key={i} className="text-stone-600 text-xs leading-relaxed">
                              {item.productName}
                              {item.formatName && (
                                <span className="text-stone-400"> · {item.formatName}{item.grams > 0 ? ` ${item.grams}g` : ""}</span>
                              )}
                              <span className="text-stone-400"> × {item.quantity}</span>
                            </p>
                          ))}
                        </td>
                        <td className="px-4 py-4 text-[#34150F] font-medium whitespace-nowrap">
                          ¥{order.total_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full border font-medium capitalize ${statusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {updatingOrderId === order.id ? (
                            <span className="text-xs text-stone-400">Updating…</span>
                          ) : confirmShipOrderId === order.id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-stone-400">Mark as shipped?</span>
                              <button
                                onClick={() => handleUpdateStatus(order.id, "shipped")}
                                className="text-xs text-[#C8965A] hover:text-[#B8854C] font-medium transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmShipOrderId(null)}
                                className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : order.status === "pending" ? (
                            <button
                              onClick={() => setConfirmShipOrderId(order.id)}
                              className="text-xs text-[#C8965A] hover:text-[#B8854C] font-medium transition-colors"
                            >
                              Mark shipped
                            </button>
                          ) : order.status === "shipped" ? (
                            <button
                              onClick={() => handleUpdateStatus(order.id, "pending")}
                              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                            >
                              Undo
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* My Products */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs tracking-widest uppercase text-stone-400">My Products</h2>
            <Link
              href="/roaster/products/new"
              className="bg-[#C8965A] hover:bg-[#B8854C] text-white text-xs font-medium px-4 py-2 rounded-full transition-colors"
            >
              + Add Product
            </Link>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 px-6 py-4 border-b border-stone-100 last:border-0 animate-pulse">
                  <div className="h-4 flex-1 bg-stone-100 rounded" />
                  <div className="h-4 w-20 bg-stone-100 rounded" />
                  <div className="h-4 w-16 bg-stone-100 rounded" />
                  <div className="h-4 w-16 bg-stone-100 rounded" />
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-red-600 font-medium mb-1">Could not load products</p>
              <p className="text-xs text-red-400 leading-relaxed">{fetchError}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 shadow-sm text-center">
              <p className="text-sm text-stone-400 mb-1">No products yet</p>
              <p className="text-xs text-stone-300">Add your first listing to appear on the marketplace.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              {deleteError && (
                <div className="px-6 py-3 bg-red-50 border-b border-red-100">
                  <p className="text-red-600 text-xs">{deleteError}</p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-6 py-3">Product</th>
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Origin</th>
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Roast</th>
                      <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Price</th>
                      <th className="text-left text-[10px] tracking-widests uppercase text-stone-400 font-medium px-4 py-3">Type</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-[#34150F] whitespace-nowrap">{p.product_name}</td>
                        <td className="px-4 py-4 text-stone-500 whitespace-nowrap">{p.origin}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full border font-medium ${roastBadge(p.roast_level)}`}>
                            {p.roast_level}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-stone-700 whitespace-nowrap">{priceDisplay(p)}</td>
                        <td className="px-4 py-4 text-stone-400 text-xs whitespace-nowrap">{p.seller_type}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {confirmDeleteId === p.id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-stone-400">Delete?</span>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs text-stone-400 hover:text-stone-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 justify-end">
                              <Link
                                href={`/roaster/products/${p.id}/edit`}
                                className="text-xs text-stone-400 hover:text-[#C8965A] transition-colors"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => { setConfirmDeleteId(p.id); setDeleteError(null) }}
                                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Coming soon cards */}
        <div>
          <h2 className="text-xs tracking-widest uppercase text-stone-400 mb-4">Coming Soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COMING_SOON_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{card.icon}</span>
                  <span className="text-[10px] tracking-widest uppercase text-stone-300 border border-stone-200 rounded-full px-2.5 py-1">
                    Soon
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-[#34150F] text-sm mb-1">{card.title}</h3>
                  <p className="text-xs text-stone-400 leading-relaxed">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marketplace link */}
        <div className="text-center pb-4">
          <Link
            href="/"
            className="text-xs text-stone-400 hover:text-[#C8965A] transition-colors tracking-wide"
          >
            ← View marketplace
          </Link>
        </div>

      </div>
    </div>
  )
}
