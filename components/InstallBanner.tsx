"use client"

import { useState, useEffect } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    setIsStandalone(standalone)
    if (standalone) return

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleInstall() {
    if (!promptEvent) return
    setInstalling(true)
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === "accepted") setDismissed(true)
    setInstalling(false)
    setPromptEvent(null)
  }

  // Don't show if: already installed, dismissed, or nothing to show
  if (isStandalone || dismissed) return null
  if (!promptEvent && !isIOS) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      <div className="bg-[#34150F] rounded-t-2xl shadow-2xl px-5 py-4 flex items-center justify-between gap-4 max-w-lg mx-auto">

        <div className="flex-1 min-w-0">
          <p className="text-[#F5ECD7] text-sm font-medium leading-snug">
            {isIOS
              ? "Add Mame Mart to your home screen"
              : "Install the Mame Mart app"}
          </p>
          {isIOS ? (
            <p className="text-stone-400 text-xs mt-0.5 leading-relaxed">
              Tap the share button{" "}
              <span aria-label="share">⎋</span>{" "}
              then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-stone-400 text-xs mt-0.5">
              Get quick access — works offline too
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isIOS && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="bg-[#C8965A] hover:bg-[#B8854C] disabled:opacity-60 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors"
            >
              {installing ? "Installing…" : "Install"}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-stone-500 hover:text-stone-300 transition-colors p-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
