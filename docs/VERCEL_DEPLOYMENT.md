# Vercel Deployment

1. Import `vmoulakakis/travel_ai` into Vercel.
2. Use the Next.js framework preset (auto-detected).
3. Add `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL=https://api.deepseek.com`, `DEEPSEEK_MODEL=deepseek-v4-pro`, and `DEEPSEEK_REASONING_EFFORT=high`.
4. Optional persistence: add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and `LINKWISE_TRAVEL_FEED_URL`, then run `supabase/migrations/0001_initial.sql`.
5. Deploy the feature branch as Preview and test `/`, `/admin`, and `/api/recommend`.
6. Merge the PR into `main` for production deployment.

## Security

Never expose `DEEPSEEK_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_` variable. Rotate credentials that have appeared in chats, logs, issues, commits, or other shared surfaces.

## Cron

`vercel.json` calls `/api/jobs/linkwise` daily. The route fails closed unless the request carries `Authorization: Bearer <CRON_SECRET>` and both the feed URL and Supabase server credentials are configured.
