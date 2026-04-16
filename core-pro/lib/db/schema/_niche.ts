// ============================================================================
// NICHE-SPECIFIC TABLES — PLACEHOLDER
// ----------------------------------------------------------------------------
// Niche verticals (FitCore, EstateCore, NutriCore, ...) add their own tables
// here or in sibling files prefixed with the niche abbreviation. Examples:
//
//   FitCore Pro   →  programs, workouts, exercises, meal_plans, meals, foods,
//                    progress_entries, progress_photos, ...
//   EstateCore Pro → properties, exclusive_contracts, transactions, viewings,
//                    offers, cma_reports, ...
//
// Conventions:
//   1. One file per domain, re-exported from ./index.ts or schema.ts.
//   2. Always include `professional_id` FK → professionals.id ON DELETE CASCADE.
//   3. Add an RLS policy scoped by `professional_id = currentProfessionalIdSql`
//      from ./_helpers — never ship a niche table without RLS.
//   4. Prefer `jsonb` metadata over rigid columns for evolving schemas; add
//      dedicated columns only once the shape stabilizes.
// ============================================================================
export {}
