import Link from "next/link"

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[#f7f5f2] flex flex-col">

      {/* Nav */}
      <nav className="bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-[#C8965A] tracking-wide">
          KOHĪ
        </Link>
        <span className="text-xs text-stone-500 tracking-widest uppercase">Checkout</span>
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

          <h1 className="font-serif text-3xl text-[#34150F] mb-3">
            Order cancelled
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-10">
            No payment was taken. Your cart is still saved — head back whenever you're ready.
          </p>

          <Link
            href="/cart"
            className="inline-block bg-[#34150F] hover:bg-[#4a1e12] text-[#F5ECD7] text-sm px-8 py-3 rounded-full transition-colors"
          >
            Back to cart
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#34150F] px-6 md:px-10 py-8 text-center">
        <span className="font-serif text-lg text-[#C8965A]">KOHĪ</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest">珈琲市 · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
