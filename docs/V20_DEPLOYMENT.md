# V20 deployment order

1. CI green on the V20 branch/PR.
2. Merge V20 to `main`.
3. Apply `20260814232000_v20_production_truth.sql` to the production Supabase project.
4. Deploy `production-truth-v20` Edge Function with its existing project secrets.
5. Deploy current `main` to Vercel.
6. Verify immutable/preview URL with `/api/v20/status`.
7. Verify canonical production alias with `/api/v20/status` and `/api/health` before declaring V20 live.
