"use client"

import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { Logo } from "@/components/Logo"

export default function CartPage() {
  const cart = useCart()

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-[#2A1508] hover:text-[#C4622D] transition-colors text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Marketplace
        </Link>
        <Link href="/">
          <Logo height={36} />
        </Link>
        <div className="w-24 text-right">
          {cart.totalCount > 0 && (
            <span className="text-xs text-stone-500">
              {cart.totalCount} item{cart.totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#F8F5F2] border-b border-[#E8E2D8] px-6 md:px-10 pt-12 pb-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">Your Cart</p>
          <h1 className="font-serif text-3xl text-[#2A1508] mb-2">
            {cart.items.length === 0 ? "Nothing here yet" : `${cart.totalCount} item${cart.totalCount !== 1 ? "s" : ""}`}
          </h1>
        </div>
      </section>

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-2xl mx-auto w-full">

        {cart.items.length === 0 ? (

          /* Empty state */
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-5">
              <svg className="h-7 w-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <p className="text-stone-500 text-sm mb-1">Your cart is empty</p>
            <p className="text-stone-400 text-xs mb-8 leading-relaxed">
              Add some coffees from the marketplace to get started.
            </p>
            <Link
              href="/"
              className="inline-block bg-[#C4622D] hover:bg-[#A84F22] text-white text-sm px-6 py-3 rounded-[2px] transition-colors"
            >
              Browse coffees
            </Link>
          </div>

        ) : (
          <div className="space-y-3">

            {/* Cart items */}
            {cart.items.map(item => (
              <div
                key={item.cartItemId}
                className="bg-white border border-[#E8E2D8] rounded p-5"
              >
                <div className="flex items-start justify-between gap-4">

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#C4622D] mb-0.5">{item.roasterName}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-[#2A1508] text-sm leading-snug">{item.productName}</p>
                      {item.batchId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] border border-[#C4622D] text-[#C4622D] leading-none">
                          Pre-order
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      {item.format.name}
                      {item.format.grams > 0 && ` · ${item.format.grams}g`}
                    </p>
                  </div>

                  {/* Line total */}
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-[#2A1508] text-sm">
                      ¥{(item.price * item.quantity).toLocaleString()}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      ¥{item.price.toLocaleString()} each
                    </p>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => cart.updateQuantity(item.cartItemId, item.quantity - 1)}
                      className="w-11 h-11 rounded-[2px] border border-[#E8E2D8] flex items-center justify-center text-stone-400 hover:border-[#C4622D] hover:text-[#C4622D] transition-colors text-lg leading-none"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium text-[#2A1508] w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => cart.updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="w-11 h-11 rounded-[2px] border border-[#E8E2D8] flex items-center justify-center text-stone-400 hover:border-[#C4622D] hover:text-[#C4622D] transition-colors text-lg leading-none"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => cart.removeItem(item.cartItemId)}
                    className="text-xs text-stone-300 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Order summary */}
            <div className="bg-white border border-[#E8E2D8] rounded p-6 mt-4">
              <h2 className="text-xs tracking-widest uppercase text-stone-400 mb-4">Order Summary</h2>

              <div className="space-y-2 mb-4">
                {cart.items.map(item => (
                  <div key={item.cartItemId} className="flex items-baseline justify-between text-sm">
                    <span className="text-stone-500 truncate mr-4">
                      {item.productName}
                      <span className="text-stone-400 text-xs"> × {item.quantity}</span>
                    </span>
                    <span className="text-[#2A1508] shrink-0">
                      ¥{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-4 flex items-baseline justify-between">
                <span className="text-sm font-medium text-[#2A1508]">Total</span>
                <span className="text-xl font-semibold text-[#2A1508]">
                  ¥{cart.totalPrice.toLocaleString()}
                </span>
              </div>

              <p className="text-[11px] text-stone-400 mt-2">
                Shipping calculated at checkout
              </p>

              <Link
                href="/checkout/address"
                className="block w-full mt-5 bg-[#2A1508] hover:bg-[#3d2010] text-white py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-colors text-center"
              >
                Proceed to Checkout
              </Link>

              <button
                onClick={cart.clearCart}
                className="w-full mt-3 text-xs text-stone-400 hover:text-stone-500 transition-colors py-1"
              >
                Clear cart
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <Logo height={32} inverted />
        <p className="text-stone-500 text-xs mt-2 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
