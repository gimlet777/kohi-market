"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useCart } from "@/context/CartContext"

export default function CheckoutSuccessPage() {
  const cart = useCart()

  // Clear cart once on mount — payment is confirmed by Stripe redirecting here
  useEffect(() => {
    cart.clearCart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-xl font-medium text-[#2A1A0E] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
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

          <h1 className="font-serif text-3xl text-[#2A1A0E] mb-3">
            Order confirmed
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-2">
            Thank you for your order.
          </p>
          <p className="text-stone-400 text-xs leading-relaxed mb-10">
            You'll receive a confirmation email shortly. Your coffee will be roasted and shipped with care.
          </p>

          <Link
            href="/"
            className="inline-block bg-[#C4714A] hover:bg-[#B05E3C] text-white text-sm px-8 py-3 rounded-[2px] transition-colors"
          >
            Back to marketplace
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="text-xl font-medium text-[#C4714A] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
