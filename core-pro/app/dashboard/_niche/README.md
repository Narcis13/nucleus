# `_niche/` — dashboard extension point

This folder is a placeholder for niche-specific dashboard modules (e.g., FitCore
Pro workouts, EstateCore Pro listings). Do **not** import from this folder in
shared/universal code — it should remain optional.

When specializing the boilerplate for a niche:

1. Drop a route group here (e.g., `workouts/page.tsx`).
2. Add a nav entry from `components/dashboard/sidebar.tsx`.
3. Prefix tables and RLS policies with the niche name to avoid collisions.
