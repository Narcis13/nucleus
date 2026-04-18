import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          We couldn&rsquo;t find that page
        </h1>
        <p className="max-w-md text-muted-foreground">
          The page you&rsquo;re looking for may have moved, been renamed, or never
          existed.
        </p>
      </div>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/" />}>
          Back to home
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Open dashboard
        </Button>
      </div>
    </div>
  )
}
