"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. Our team has been notified and is looking
          into it.
        </p>
        {error.digest && (
          <p className="text-muted-foreground text-xs font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="mailto:support@corepro.app" />}
        >
          Contact support
        </Button>
      </div>
    </div>
  )
}
