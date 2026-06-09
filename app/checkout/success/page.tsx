"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { Logo } from "@/components/Logo"

export default function CheckoutSuccessPage() {
  const cart = useCart()

  // Clear cart once on mount — payment is confirmed by Stripe redirecting here
  useEffect(() => {
    cart.clearCart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/">
          <Logo height={36} />
        </Link>
      </nav>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-sm">

          {/* Check icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-8">
            <svg className="h-9 w-9 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="font-serif text-3xl text-[#2A1508] mb-3">
            Order confirmed
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-2">
            Thank you for your order.
          </p>
          <p className="text-stone-400 text-xs leading-relaxed mb-10">
            You&apos;ll receive a confirmation email shortly. Your coffee will be roasted and shipped with care.
          </p>

          <Link
            href="/"
            className="inline-block bg-[#C4622D] hover:bg-[#A84F22] text-white text-sm px-8 py-3 rounded-[2px] transition-colors"
          >
            Back to marketplace
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <Logo height={32} inverted />
        <p className="text-stone-500 text-xs mt-2 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
