"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { Download, RotateCw, WifiOff, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// PwaProvider
//
// Single client-side entry point for PWA plumbing that must run on every
// authenticated route:
//
//   1. Registers /sw.js (idempotent — push-subscription also calls register,
//      both land on the same registration).
//   2. Watches for `beforeinstallprompt` and renders a dismissible install
//      banner. Stores dismissal in localStorage so we don't nag.
//   3. Tracks online/offline state and shows a thin banner when the user
//      drops off the network.
//   4. Listens for `outbox-*` messages from the service worker so queued
//      messages surface a toast when they flush.
//   5. Prompts for a reload when a new service worker activates, so users
//      don't run on a stale shell.
//
// Add <PwaProvider /> to the dashboard + portal layouts; it renders nothing
// until an event fires, so it's safe to mount app-wide.
// ─────────────────────────────────────────────────────────────────────────────

// The event is not in the standard DOM lib types; declare a minimal shape.
type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  prompt: () => Promise<void>
}

const DISMISS_KEY = "corepro:install-prompt-dismissed-at"
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14 // two weeks

const subscribeOnline = (notify: () => void) => {
  if (typeof window === "undefined") return () => {}
  window.addEventListener("online", notify)
  window.addEventListener("offline", notify)
  return () => {
    window.removeEventListener("online", notify)
    window.removeEventListener("offline", notify)
  }
}

const getOnline = () => {
  if (typeof navigator === "undefined") return true
  return navigator.onLine
}

export function PwaProvider() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installBannerVisible, setInstallBannerVisible] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)

  // Drive the offline banner from the native event source directly so we
  // never need to synchronise state inside an effect — avoids the React 19
  // set-state-in-effect lint rule and eliminates a mount-time re-render.
  const isOffline = !useSyncExternalStore(
    subscribeOnline,
    getOnline,
    () => true,
  )

  // ── Service worker registration + update detection ──
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    let disposed = false

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js")
        if (disposed) return

        // If a worker is already waiting at mount, surface the prompt.
        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting
          setUpdateReady(true)
        }

        reg.addEventListener("updatefound", () => {
          const next = reg.installing
          if (!next) return
          next.addEventListener("statechange", () => {
            if (
              next.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              waitingWorkerRef.current = next
              setUpdateReady(true)
            }
          })
        })
      } catch {
        // Service workers can fail to register in private mode / unsupported
        // browsers. Treat it as a no-op; the app still works.
      }
    }

    void register()

    let reloadedForNewSW = false
    const onControllerChange = () => {
      if (reloadedForNewSW) return
      reloadedForNewSW = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    )

    return () => {
      disposed = true
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      )
    }
  }, [])

  // ── Install prompt ──
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0")
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return
      setInstallEvent(event as BeforeInstallPromptEvent)
      setInstallBannerVisible(true)
    }
    const onInstalled = () => {
      setInstallBannerVisible(false)
      setInstallEvent(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // ── Kick the outbox when the browser comes back online ──
  // The offline state itself is read via useSyncExternalStore above; here
  // we only need the edge-triggered "you're online again" effect. A dedicated
  // `online` listener keeps this logic self-contained and avoids racing with
  // the store update.
  useEffect(() => {
    if (typeof window === "undefined") return
    const onOnline = () => {
      void navigator.serviceWorker?.controller?.postMessage({
        type: "sync-outbox",
      })
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [])

  // ── Outbox broadcasts from the SW → toast notifications ──
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    type OutboxMessage = {
      type: "outbox-queued" | "outbox-flushed" | "outbox-failed"
      url?: string
      status?: number
    }
    const onMessage = (event: MessageEvent<OutboxMessage>) => {
      const data = event.data
      if (!data || typeof data !== "object") return
      if (data.type === "outbox-queued") {
        toast("Saved offline", {
          description: "We will send this automatically when you reconnect.",
          icon: <WifiOff className="size-4" />,
        })
      } else if (data.type === "outbox-flushed") {
        toast.success("Synced offline changes")
      } else if (data.type === "outbox-failed") {
        toast.error("A queued action failed", {
          description: data.status
            ? `Server responded ${data.status}.`
            : undefined,
        })
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])

  const onInstallClick = useCallback(async () => {
    if (!installEvent) return
    try {
      await installEvent.prompt()
      await installEvent.userChoice
    } catch {
      // Chrome rejects a second prompt call — ignore.
    }
    setInstallBannerVisible(false)
    setInstallEvent(null)
  }, [installEvent])

  const onDismissInstall = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setInstallBannerVisible(false)
  }, [])

  const onReload = useCallback(() => {
    const waiting = waitingWorkerRef.current
    if (waiting) {
      waiting.postMessage({ type: "skip-waiting" })
    } else {
      window.location.reload()
    }
  }, [])

  return (
    <>
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2",
            "bg-amber-500/95 px-3 py-1 text-xs font-medium text-amber-950",
            "pt-[max(0.25rem,env(safe-area-inset-top))]",
          )}
        >
          <WifiOff className="size-3.5" aria-hidden />
          You&apos;re offline — cached pages still work.
        </div>
      )}

      {updateReady && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-lg lg:bottom-6"
        >
          <div className="flex items-center gap-2 text-sm">
            <RotateCw className="size-4 text-muted-foreground" aria-hidden />
            <span>A new version of CorePro is ready.</span>
          </div>
          <Button size="sm" onClick={onReload}>
            Reload
          </Button>
        </div>
      )}

      {installBannerVisible && installEvent && (
        <div
          role="dialog"
          aria-label="Install CorePro"
          className="fixed inset-x-0 bottom-[max(5rem,calc(env(safe-area-inset-bottom)+5rem))] z-[55] mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-lg lg:bottom-6"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                Install CorePro
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Launches as an app, works offline.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" onClick={onInstallClick}>
              Install
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onDismissInstall}
              aria-label="Dismiss install prompt"
            >
              <X />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
