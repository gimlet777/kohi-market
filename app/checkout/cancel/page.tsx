import Link from "next/link"
import { Logo } from "@/components/Logo"

export default function CheckoutCancelPage() {
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

          {/* X icon */}
          <div className="w-20 h-20 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-8">
            <svg className="h-9 w-9 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="font-serif text-3xl text-[#2A1508] mb-3">
            Order cancelled
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-10">
            No payment was taken. Your cart is still saved — head back whenever you&apos;re ready.
          </p>

          <Link
            href="/cart"
            className="inline-block bg-[#2A1508] hover:bg-[#3d2010] text-white text-sm px-8 py-3 rounded-[2px] transition-colors"
          >
            Back to cart
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
