"use client"

import type { ComponentProps, ReactNode } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// <ResponsiveDialog>
//
// Renders a centered modal on desktop and a bottom sheet on mobile. Shares
// the same Base UI Dialog primitive in both cases so focus management,
// escape handling, and scroll locking all behave identically.
//
// The breakpoint matches Tailwind's `sm` — below 640px we swap to a
// bottom-anchored panel with a drag handle. Content is scrollable inside
// the sheet so long forms (new appointment, new invoice) still work on
// short screens.
// ─────────────────────────────────────────────────────────────────────────────

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

export const ResponsiveDialogTrigger = DialogTrigger

export function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogContent>) {
  const isMobile = useMediaQuery("(max-width: 639px)")

  if (!isMobile) {
    return (
      <DialogContent
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </DialogContent>
    )
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="responsive-dialog-overlay"
        className="fixed inset-0 z-50 bg-black/30 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="responsive-dialog-sheet"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-3 rounded-t-2xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          "duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
          className,
        )}
        {...props}
      >
        <div className="flex justify-center pt-2">
          <span
            aria-hidden
            className="h-1 w-10 rounded-full bg-muted-foreground/40"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {children}
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export const ResponsiveDialogHeader = DialogHeader
export const ResponsiveDialogTitle = DialogTitle
export const ResponsiveDialogDescription = DialogDescription
