"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { ProductRow } from "@/lib/products"
import { UserNav } from "@/components/UserNav"
import { NavLogo } from "@/components/NavLogo"

interface RoasterProfile {
  roaster_name: string
  email: string
  region: string
  seller_type: string
  bio?: string
  website?: string
  is_pro?: boolean
  hero_photo_url?: string | null
  gallery_urls?: string[] | null
  qr_version?: number | null
}

const REGIONS = ["Tokyo", "Kyoto", "Osaka", "Fukuoka", "Hokkaido"]

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

interface BatchRow {
  id: string
  product_id: number
  roast_date: string | null
  available_now: boolean
  total_bags: number
  bags_remaining: number
  status: "open" | "closed" | "complete"
  created_at: string
  products: { product_name: string } | null
}

type Tab = "overview" | "batches" | "settings"

const COMING_SOON_CARDS = [
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

function batchStatusBadge(status: BatchRow["status"]) {
  const map: Record<BatchRow["status"], string> = {
    open: "bg-emerald-50 text-emerald-700 border-emerald-100",
    closed: "bg-stone-100 text-stone-500 border-stone-200",
    complete: "bg-blue-50 text-blue-700 border-blue-100",
  }
  return map[status]
}

function priceDisplay(product: ProductRow) {
  if (product.formats?.length) {
    const prices = product.formats.map(f => f.price)
    const min = Math.min(...prices)
    return prices.length > 1 ? `From ¥${min.toLocaleString()}` : `¥${min.toLocaleString()}`
  }
  return `¥${product.price?.toLocaleString() ?? "—"}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatRoastDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F5F2]" />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<RoasterProfile | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get("tab") === "batches" ? "batches" : "overview"
  )
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState<string | null>(null)
  const [deleteBatchError, setDeleteBatchError] = useState<string | null>(null)
  const [confirmShipOrderId, setConfirmShipOrderId] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  // Settings form
  const [settingsName, setSettingsName] = useState("")
  const [settingsRegion, setSettingsRegion] = useState("")
  const [settingsBio, setSettingsBio] = useState("")
  const [settingsWebsite, setSettingsWebsite] = useState("")
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  // QR stamp code
  const [qrVersion, setQrVersion] = useState(1)
  const [notifPrefs, setNotifPrefs] = useState({ new_order: true, order_reminder: true, low_stock: true, batch_expired: true })
  const [notifSaving, setNotifSaving] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [confirmRegen, setConfirmRegen] = useState(false)

  // Pro media
  const [heroUrl, setHeroUrl] = useState("")
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [heroUploading, setHeroUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)


  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace("/roaster/login")
        return
      }
      setUserId(session.user.id)

      const [
        { data: profileData, error: profileError },
        { data: productsData, error: productsError },
        { data: ordersData, error: ordersError },
        { data: batchesData, error: batchesError },
        { data: notifPrefsData },
      ] = await Promise.all([
        supabase
          .from("roasters")
          .select("roaster_name, email, region, seller_type, bio, website, is_pro, hero_photo_url, gallery_urls, qr_version")
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
        supabase
          .from("batches")
          .select("id, product_id, roast_date, available_now, total_bags, bags_remaining, status, created_at, products(product_name)")
          .eq("roaster_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("roaster_notification_preferences")
          .select("new_order, order_reminder, low_stock, batch_expired")
          .eq("roaster_id", session.user.id)
          .maybeSingle(),
      ])

      if (profileError) console.error("Profile fetch error:", profileError)
      if (productsError) { console.error("Products fetch error:", productsError); setFetchError(productsError.message) }
      if (ordersError) console.error("Orders fetch error:", ordersError)
      if (batchesError) console.error("Batches fetch error:", batchesError)

      setProfile(profileData)
      if (profileData) {
        setSettingsName(profileData.roaster_name ?? "")
        setSettingsRegion(profileData.region ?? "")
        setSettingsBio(profileData.bio ?? "")
        setSettingsWebsite(profileData.website ?? "")
        setHeroUrl(profileData.hero_photo_url ?? "")
        setGalleryUrls(profileData.gallery_urls ?? [])
        setQrVersion(profileData.qr_version ?? 1)
      }
      setProducts(productsData ?? [])
      setOrders((ordersData ?? []) as Order[])
      setBatches((batchesData ?? []) as unknown as BatchRow[])
      if (notifPrefsData) {
        setNotifPrefs({
          new_order:      notifPrefsData.new_order,
          order_reminder: notifPrefsData.order_reminder,
          low_stock:      notifPrefsData.low_stock,
          batch_expired:  notifPrefsData.batch_expired,
        })
      }
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
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } else {
      console.error("Order status update error:", error)
    }
    setUpdatingOrderId(null)
    setConfirmShipOrderId(null)
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSettingsSaving(true)
    setSettingsError(null)
    setSettingsSaved(false)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace("/roaster/login"); return }

    const { error } = await supabase
      .from("roasters")
      .update({
        roaster_name: settingsName.trim(),
        region: settingsRegion,
        bio: settingsBio.trim() || null,
        website: settingsWebsite.trim() || null,
      })
      .eq("id", session.user.id)

    if (error) {
      setSettingsError(error.message)
    } else {
      setProfile(prev => prev ? { ...prev, roaster_name: settingsName.trim(), region: settingsRegion, bio: settingsBio.trim() || undefined, website: settingsWebsite.trim() || undefined } : prev)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    }
    setSettingsSaving(false)
  }

  async function handleHeroUpload(file: File) {
    if (!userId) return
    setHeroUploading(true)
    setImageError(null)
    const ext = file.name.split(".").pop() ?? "jpg"
    const path = `${userId}/hero.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("roaster-hero")
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setImageError("Upload failed: " + uploadError.message)
      setHeroUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from("roaster-hero").getPublicUrl(path)
    const { error: dbError } = await supabase.from("roasters").update({ hero_photo_url: publicUrl }).eq("id", userId)
    if (dbError) {
      setImageError("Upload saved but profile update failed: " + dbError.message)
    } else {
      setHeroUrl(publicUrl)
      setProfile(prev => prev ? { ...prev, hero_photo_url: publicUrl } : prev)
    }
    setHeroUploading(false)
  }

  async function handleHeroRemove() {
    if (!userId) return
    const { error } = await supabase.from("roasters").update({ hero_photo_url: null }).eq("id", userId)
    if (!error) {
      setHeroUrl("")
      setProfile(prev => prev ? { ...prev, hero_photo_url: null } : prev)
    }
  }

  async function handleGalleryAdd(file: File) {
    if (!userId || galleryUrls.length >= 6) return
    setGalleryUploading(true)
    setImageError(null)
    const ext = file.name.split(".").pop() ?? "jpg"
    const path = `${userId}/gallery-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("roaster-gallery")
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setImageError("Upload failed: " + uploadError.message)
      setGalleryUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from("roaster-gallery").getPublicUrl(path)
    const newUrls = [...galleryUrls, publicUrl]
    const { error: dbError } = await supabase.from("roasters").update({ gallery_urls: newUrls }).eq("id", userId)
    if (dbError) {
      setImageError("Upload saved but profile update failed: " + dbError.message)
    } else {
      setGalleryUrls(newUrls)
    }
    setGalleryUploading(false)
  }

  async function handleGalleryRemove(url: string) {
    if (!userId) return
    const newUrls = galleryUrls.filter(u => u !== url)
    const { error } = await supabase.from("roasters").update({ gallery_urls: newUrls }).eq("id", userId)
    if (!error) setGalleryUrls(newUrls)
  }

  async function downloadStampQR() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace("/roaster/login"); return }
    const res = await fetch("/api/stamp-qr", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(body.error ?? "Failed to generate QR code")
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stamp-qr-v${qrVersion}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleDownloadQR() {
    setQrLoading(true)
    setQrError(null)
    try {
      await downloadStampQR()
    } catch (e: unknown) {
      setQrError(e instanceof Error ? e.message : "Failed to generate QR code")
    } finally {
      setQrLoading(false)
    }
  }

  async function handleRegenerateQR() {
    if (!userId) return
    setQrLoading(true)
    setQrError(null)
    setConfirmRegen(false)
    try {
      const newVersion = qrVersion + 1
      const { error: updateError } = await supabase
        .from("roasters")
        .update({ qr_version: newVersion })
        .eq("id", userId)
      if (updateError) throw new Error(updateError.message)
      setQrVersion(newVersion)
      await downloadStampQR()
    } catch (e: unknown) {
      setQrError(e instanceof Error ? e.message : "Failed to regenerate QR code")
    } finally {
      setQrLoading(false)
    }
  }

  async function handleDeleteBatch(id: string) {
    setDeleteBatchError(null)
    const { error } = await supabase.from("batches").delete().eq("id", id)
    if (error) {
      setDeleteBatchError(error.message)
    } else {
      setBatches(prev => prev.filter(b => b.id !== id))
      setConfirmDeleteBatchId(null)
    }
  }

  async function handleToggleNotif(key: keyof typeof notifPrefs) {
    if (!userId || notifSaving) return
    const next = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(next)
    setNotifSaving(true)
    const { error } = await supabase
      .from("roaster_notification_preferences")
      .upsert({ roaster_id: userId, ...next, updated_at: new Date().toISOString() })
    if (error) {
      console.error("Failed to save notification preferences:", error)
      setNotifPrefs(notifPrefs)
    }
    setNotifSaving(false)
  }

  const isCafeRoaster = profile?.seller_type === "Café Roaster"

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <NavLogo />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-stone-400 tracking-widest uppercase">Roaster Portal</span>
          <UserNav />
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-[#F8F5F2] border-b border-[rgba(42,21,8,0.07)] px-6 md:px-10 pt-10 pb-8">
        {isLoading ? (
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="h-3 w-24 bg-stone-100 rounded animate-pulse" />
            <div className="h-8 w-64 bg-stone-100 rounded animate-pulse" />
            <div className="h-3 w-48 bg-stone-100 rounded animate-pulse mt-2" />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">Dashboard</p>
            <h1 className="font-serif text-3xl text-[#2A1508] mb-1">
              Welcome back, <span className="text-[#C4622D]">{profile?.roaster_name ?? "Roaster"}</span>
            </h1>
            <p className="text-sm text-stone-400 font-light">{profile?.seller_type} · {profile?.region}</p>
          </div>
        )}
      </div>

      {/* Tab bar */}
      {!isLoading && (
        <div className="bg-white border-b border-stone-200 px-6 md:px-10">
          <div className="max-w-5xl mx-auto flex gap-0">
            {(["overview", ...(isCafeRoaster ? ["batches"] : []), "settings"] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3.5 text-xs tracking-widest uppercase font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-[#2A1508] text-[#2A1508]"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "batches" ? "Batch Schedule" : "Settings"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-5xl mx-auto w-full space-y-10">

        {/* ── BATCH SCHEDULE TAB ─────────────────────────────────────────────── */}
        {activeTab === "batches" && isCafeRoaster && (
          <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs tracking-widest uppercase text-stone-400">Batch Schedule</h2>
                {batches.length > 0 && (
                  <p className="text-xs text-stone-400 mt-1">
                    {batches.filter(b => b.status === "open").length} open batch{batches.filter(b => b.status === "open").length !== 1 ? "es" : ""}
                  </p>
                )}
              </div>
              <Link
                href="/roaster/batches/new"
                className="bg-[#C4622D] hover:bg-[#B0561A] text-white text-xs font-medium px-4 py-2 rounded-[2px] transition-colors"
              >
                + List a Batch
              </Link>
            </div>

            {/* Batches table */}
            {batches.length === 0 ? (
              <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-10 text-center">
                <p className="text-sm text-stone-400 mb-1">No batches yet</p>
                <p className="text-xs text-stone-300">Schedule a roast batch to open pre-orders on the marketplace.</p>
              </div>
            ) : (
              <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-6 py-3">Roast date</th>
                        <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Product</th>
                        <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Total bags</th>
                        <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Remaining</th>
                        <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Pre-orders</th>
                        <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(batch => {
                        const preorders = batch.total_bags - batch.bags_remaining
                        return (
                          <tr key={batch.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {batch.available_now ? (
                                <span className="inline-block text-[10px] px-2.5 py-1 rounded-[2px] border font-medium bg-emerald-50 text-emerald-700 border-emerald-100">
                                  In stock
                                </span>
                              ) : (
                                <span className="text-stone-600 text-sm font-medium">
                                  {batch.roast_date ? formatRoastDate(batch.roast_date) : "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-[#2A1508] whitespace-nowrap">
                              {batch.products?.product_name ?? "—"}
                            </td>
                            <td className="px-4 py-4 text-stone-600 whitespace-nowrap">
                              {batch.total_bags}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`font-medium ${
                                batch.bags_remaining === 0
                                  ? "text-red-500"
                                  : batch.bags_remaining <= 5
                                    ? "text-amber-600"
                                    : "text-stone-600"
                              }`}>
                                {batch.bags_remaining}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-stone-600 whitespace-nowrap">
                              {preorders > 0 ? (
                                <span className="font-medium text-[#2A1508]">{preorders}</span>
                              ) : (
                                <span className="text-stone-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-block text-[10px] px-2.5 py-1 rounded-[2px] border font-medium capitalize ${batchStatusBadge(batch.status)}`}>
                                {batch.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              {confirmDeleteBatchId === batch.id ? (
                                <span className="inline-flex items-center gap-3">
                                  {preorders > 0 && (
                                    <span className="text-[10px] text-amber-600 mr-1">
                                      {preorders} order{preorders !== 1 ? "s" : ""} placed
                                    </span>
                                  )}
                                  <span className="text-xs text-stone-500">Remove?</span>
                                  <button
                                    onClick={() => handleDeleteBatch(batch.id)}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteBatchId(null)}
                                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-4">
                                  <Link
                                    href={`/roaster/batches/new?edit=${batch.id}`}
                                    className="text-xs text-stone-400 hover:text-[#C4622D] transition-colors"
                                  >
                                    Edit
                                  </Link>
                                  <button
                                    onClick={() => setConfirmDeleteBatchId(batch.id)}
                                    className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {deleteBatchError && (
              <p className="text-xs text-red-500">{deleteBatchError}</p>
            )}
          </div>
        )}

        {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>

            {/* Profile card */}
            {isLoading ? (
              <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-6 animate-pulse">
                <div className="h-4 w-24 bg-stone-100 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-3 w-48 bg-stone-100 rounded" />
                  <div className="h-3 w-36 bg-stone-100 rounded" />
                  <div className="h-3 w-32 bg-stone-100 rounded" />
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-6">
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
                      <dd className="text-[#2A1508] font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Orders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Orders</h2>
                {orders.length > 0 && (
                  <span className="text-xs text-stone-400">
                    {orders.filter(o => o.status === "pending").length} pending
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] overflow-hidden">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-4 px-6 py-5 border-b border-stone-100 last:border-0 animate-pulse">
                      <div className="h-4 flex-1 bg-stone-100 rounded" />
                      <div className="h-4 w-24 bg-stone-100 rounded" />
                      <div className="h-4 w-20 bg-stone-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-10 text-center">
                  <p className="text-sm text-stone-400 mb-1">No orders yet</p>
                  <p className="text-xs text-stone-300">Orders will appear here when customers purchase your coffee.</p>
                </div>
              ) : (
                <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
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
                              <p className="text-[#2A1508] font-medium text-sm">{order.buyer_name}</p>
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
                            <td className="px-4 py-4 text-[#2A1508] font-medium whitespace-nowrap">
                              ¥{order.total_amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-block text-[10px] px-2.5 py-1 rounded-[2px] border font-medium capitalize ${statusBadge(order.status)}`}>
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
                                    className="text-xs text-[#C4622D] hover:text-[#B0561A] font-medium transition-colors"
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
                                  className="text-xs text-[#C4622D] hover:text-[#B0561A] font-medium transition-colors"
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
                <div className="flex items-center gap-2">
                  {isCafeRoaster && (
                    <Link
                      href="/roaster/batches/new"
                      className="border border-stone-200 text-stone-500 hover:border-[#C4622D] hover:text-[#C4622D] text-xs font-medium px-4 py-2 rounded-[2px] transition-colors"
                    >
                      + List a Batch
                    </Link>
                  )}
                  <Link
                    href="/roaster/products/new"
                    className="bg-[#C4622D] hover:bg-[#B0561A] text-white text-xs font-medium px-4 py-2 rounded-[2px] transition-colors"
                  >
                    + Add Product
                  </Link>
                </div>
              </div>

              {isLoading ? (
                <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] overflow-hidden">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 px-6 py-4 border-b border-stone-100 last:border-0 animate-pulse">
                      <div className="h-4 flex-1 bg-stone-100 rounded" />
                      <div className="h-4 w-20 bg-stone-100 rounded" />
                      <div className="h-4 w-16 bg-stone-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : fetchError ? (
                <div className="bg-red-50 border border-red-100 rounded-[2px] p-6">
                  <p className="text-sm text-red-600 font-medium mb-1">Could not load products</p>
                  <p className="text-xs text-red-400 leading-relaxed">{fetchError}</p>
                </div>
              ) : products.length === 0 ? (
                <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-10 text-center">
                  <p className="text-sm text-stone-400 mb-1">No products yet</p>
                  <p className="text-xs text-stone-300">Add your first listing to appear on the marketplace.</p>
                </div>
              ) : (
                <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] overflow-hidden">
                  {deleteError && (
                    <div className="px-6 py-3 bg-red-50 border-b border-red-100">
                      <p className="text-red-600 text-xs">{deleteError}</p>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-stone-100">
                          <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-6 py-3">Product</th>
                          <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Origin</th>
                          <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Roast</th>
                          <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Price</th>
                          <th className="text-left text-[10px] tracking-widest uppercase text-stone-400 font-medium px-4 py-3">Formats</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-[#2A1508] whitespace-nowrap">{p.product_name}</td>
                            <td className="px-4 py-4 text-stone-500 whitespace-nowrap">{p.origin}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-block text-[10px] px-2.5 py-1 rounded-[2px] border font-medium ${roastBadge(p.roast_level)}`}>
                                {p.roast_level}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-stone-700 whitespace-nowrap">{priceDisplay(p)}</td>
                            <td className="px-4 py-4 text-stone-400 text-xs whitespace-nowrap">
                              {p.formats?.length ?? 1} format{(p.formats?.length ?? 1) !== 1 ? "s" : ""}
                            </td>
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
                                    className="text-xs text-stone-400 hover:text-[#C4622D] transition-colors"
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

            {/* Coming soon */}
            <div>
              <h2 className="text-xs tracking-widest uppercase text-stone-400 mb-4">Coming Soon</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COMING_SOON_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-6 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{card.icon}</span>
                      <span className="text-[10px] tracking-widest uppercase text-stone-300 border border-stone-200 rounded-[2px] px-2.5 py-1">
                        Soon
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-[#2A1508] text-sm mb-1">{card.title}</h3>
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
                className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors tracking-wide"
              >
                ← View marketplace
              </Link>
            </div>

          </>
        )}

        {/* ── SETTINGS TAB ───────────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div className="max-w-lg space-y-6">

            <form onSubmit={handleSaveSettings} className="space-y-6">

              {/* Profile details */}
              <div className="space-y-5">
                <h2 className="text-[10px] tracking-[0.25em] uppercase text-stone-400">Account Settings</h2>

                {/* Display name */}
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                    placeholder="Your roastery name"
                    className="w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1508] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4622D] transition-colors font-light"
                  />
                </div>

                {/* Region */}
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1.5">
                    Region
                  </label>
                  <div className="relative">
                    <select
                      value={settingsRegion}
                      onChange={e => setSettingsRegion(e.target.value)}
                      className="w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1508] bg-white focus:outline-none focus:border-[#C4622D] transition-colors font-light appearance-none pr-10"
                    >
                      <option value="">Select region…</option>
                      {REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    value={settingsBio}
                    onChange={e => setSettingsBio(e.target.value)}
                    placeholder="Tell customers about your roastery, your philosophy, and what makes your coffee special…"
                    className="w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1508] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4622D] transition-colors font-light resize-none"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1.5">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={settingsWebsite}
                    onChange={e => setSettingsWebsite(e.target.value)}
                    placeholder="https://yourroastery.com"
                    className="w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1508] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4622D] transition-colors font-light"
                  />
                </div>

                {/* Email — read only */}
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email ?? ""}
                    className="w-full px-4 py-3 border border-stone-100 rounded-[2px] text-sm text-stone-400 bg-stone-50 font-light cursor-not-allowed"
                  />
                  <p className="text-[11px] text-stone-300 mt-1.5 font-light">
                    To change your email address, contact support.
                  </p>
                </div>
              </div>

              {settingsError && (
                <p className="text-xs text-red-500 font-light">{settingsError}</p>
              )}

              <div className="flex items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="bg-[#2A1508] hover:bg-[#3a2010] disabled:opacity-60 text-white text-sm px-6 py-2.5 rounded-[2px] font-light transition-colors"
                >
                  {settingsSaving ? "Saving…" : "Save changes"}
                </button>
                {settingsSaved && (
                  <span className="text-sm text-[#C4622D] font-light">Changes saved ✓</span>
                )}
              </div>

            </form>

            {/* Pro Media — only shown for Pro roasters, auto-saves on upload */}
            {profile?.is_pro && (
              <div className="border-t border-[rgba(42,21,8,0.07)] pt-6 space-y-5">
                <h2 className="text-[10px] tracking-[0.25em] uppercase text-stone-400">Pro Profile Media</h2>

                {/* Hero photo */}
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1.5">
                    Hero Photo
                  </label>
                  {heroUrl ? (
                    <div className="relative">
                      <img src={heroUrl} alt="Hero" className="w-full h-36 object-cover rounded-[2px] border border-[rgba(42,21,8,0.07)]" />
                      <button
                        type="button"
                        onClick={handleHeroRemove}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white text-stone-500 hover:text-red-500 text-[11px] px-2.5 py-1 rounded-[2px] border border-stone-200 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-[rgba(42,21,8,0.07)] rounded-[2px] bg-white cursor-pointer hover:border-[#C4622D] transition-colors">
                      {heroUploading ? (
                        <span className="text-xs text-stone-400">Uploading…</span>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-stone-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          <span className="text-xs text-stone-400">Click to upload hero photo</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={heroUploading}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f) }}
                      />
                    </label>
                  )}
                  <p className="text-[11px] text-stone-300 mt-1.5 font-light">Shown as a full-width banner on your public profile.</p>
                </div>

                {/* Gallery */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-stone-400">
                      Photo Gallery
                    </label>
                    <span className="text-[11px] text-stone-300 font-light">{galleryUrls.length} / 6</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {galleryUrls.map((url, i) => (
                      <div key={url} className="relative group aspect-square">
                        <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover rounded-[2px] border border-[rgba(42,21,8,0.07)]" />
                        <button
                          type="button"
                          onClick={() => handleGalleryRemove(url)}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-[2px] transition-all"
                        >
                          <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-medium transition-opacity">Remove</span>
                        </button>
                      </div>
                    ))}
                    {galleryUrls.length < 6 && (
                      <label className="aspect-square flex items-center justify-center border border-dashed border-[rgba(42,21,8,0.07)] rounded-[2px] bg-white cursor-pointer hover:border-[#C4622D] transition-colors">
                        {galleryUploading ? (
                          <span className="text-xs text-stone-400">…</span>
                        ) : (
                          <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={galleryUploading || galleryUrls.length >= 6}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleGalleryAdd(f) }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1.5 font-light">Up to 6 images shown in a grid on your public profile.</p>
                </div>

                {imageError && (
                  <p className="text-xs text-red-500 font-light">{imageError}</p>
                )}
              </div>
            )}

            {/* QR Stamp Code */}
            <div className="border-t border-[rgba(42,21,8,0.07)] pt-6 space-y-4">
              <div>
                <h2 className="text-[10px] tracking-[0.25em] uppercase text-stone-400">Stamp QR Code</h2>
                <p className="text-xs text-stone-400 font-light mt-1 leading-relaxed">
                  Display this QR code at your roastery or include it in packaging. Customers scan it to earn loyalty stamps.
                </p>
              </div>

              <p className="text-[10px] tracking-widest uppercase text-stone-300">Version {qrVersion}</p>

              {confirmRegen ? (
                <div className="bg-amber-50 border border-amber-100 rounded-[2px] px-4 py-3 space-y-3">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Regenerating will invalidate any printed or distributed copies of the current QR code. A new version will be downloaded automatically.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRegenerateQR}
                      disabled={qrLoading}
                      className="text-xs bg-[#2A1508] hover:bg-[#3a2010] disabled:opacity-60 text-white px-4 py-2 rounded-[2px] transition-colors"
                    >
                      {qrLoading ? "Regenerating…" : "Confirm regenerate"}
                    </button>
                    <button
                      onClick={() => setConfirmRegen(false)}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadQR}
                    disabled={qrLoading}
                    className="bg-[#2A1508] hover:bg-[#3a2010] disabled:opacity-60 text-white text-xs font-medium px-4 py-2.5 rounded-[2px] transition-colors"
                  >
                    {qrLoading ? "Generating…" : "Download Stamp QR Code"}
                  </button>
                  <button
                    onClick={() => { setConfirmRegen(true); setQrError(null) }}
                    disabled={qrLoading}
                    className="text-xs text-stone-400 hover:text-[#C4622D] disabled:opacity-40 transition-colors"
                  >
                    Regenerate QR →
                  </button>
                </div>
              )}

              {qrError && (
                <p className="text-xs text-red-500 font-light">{qrError}</p>
              )}
            </div>

            {/* Notification Settings */}
            <div className="border-t border-[rgba(42,21,8,0.07)] pt-6 space-y-4">
              <div>
                <h2 className="text-[10px] tracking-[0.25em] uppercase text-stone-400">Notification Settings</h2>
                <p className="text-xs text-stone-400 font-light mt-1 leading-relaxed">
                  Email notifications sent to <span className="text-[#2A1508]">{profile?.email}</span>
                </p>
              </div>

              <div className="space-y-0 divide-y divide-[rgba(42,21,8,0.05)]">
                {([
                  { key: "new_order",      label: "New order received",         desc: "When a customer places an order for your products" },
                  { key: "order_reminder", label: "Order shipping reminder",     desc: "If an order hasn't been marked shipped after 3 days" },
                  { key: "low_stock",      label: "Low stock warning",           desc: "When a batch drops to 5 or fewer bags remaining" },
                  { key: "batch_expired",  label: "Batch sold out",              desc: "When a batch sells out completely" },
                ] as const).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm text-[#2A1508] font-light">{label}</p>
                      <p className="text-[11px] text-stone-400 font-light mt-0.5">{desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifPrefs[key]}
                      onClick={() => handleToggleNotif(key)}
                      disabled={notifSaving}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        notifPrefs[key] ? "bg-[#C4622D]" : "bg-stone-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          notifPrefs[key] ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-8 text-center mt-auto">
        <span className="text-lg font-medium text-[#C4622D] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Roaster Portal</p>
      </footer>
    </div>
  )
}
