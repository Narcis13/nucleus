import "server-only"

import type { Tx } from "@/lib/db/rls"

export type ServiceContext = {
  userId: string
  orgId: string | null
  db: Tx
}
