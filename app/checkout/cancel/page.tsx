import Link from "next/link"

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
          <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
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

          <h1 className="font-serif text-3xl text-[#2A1A0E] mb-3">
            Order cancelled
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-10">
            No payment was taken. Your cart is still saved — head back whenever you're ready.
          </p>

          <Link
            href="/cart"
            className="inline-block bg-[#2A1A0E] hover:bg-[#3a2010] text-white text-sm px-8 py-3 rounded-[2px] transition-colors"
          >
            Back to cart
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="font-serif text-xl text-[#C4714A]">珈琲市</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">KOHĪ · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
