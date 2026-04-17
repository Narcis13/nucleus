// Placeholder shape compatible with @supabase/supabase-js generics.
// Regenerate with real column types after migrations are applied:
//   npx supabase gen types typescript --local > types/database.ts
//
// Until then, this keeps `SupabaseClient<Database>` compilations happy without
// constraining row shapes. Drizzle's inferred types in `types/domain.ts`
// remain the authoritative source for server-side reads/writes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
    >
    Views: Record<string, { Row: Record<string, unknown> }>
    Functions: Record<
      string,
      { Args: Record<string, unknown>; Returns: unknown }
    >
    Enums: Record<string, string>
    CompositeTypes: Record<string, Record<string, unknown>>
  }
}
