// Aggregates every domain schema file so `drizzle-kit generate` and the
// Drizzle clients (lib/db/client.ts) see a single, complete schema.
//
// New niche-specific domains should be added here once stabilized.
export * from "./schema/professionals"
export * from "./schema/clients"
export * from "./schema/leads"
export * from "./schema/services"
export * from "./schema/scheduling"
export * from "./schema/messaging"
export * from "./schema/forms"
export * from "./schema/documents"
export * from "./schema/notifications"
export * from "./schema/automations"
export * from "./schema/invoices"
export * from "./schema/micro_sites"
export * from "./schema/settings"
export * from "./schema/_niche"
