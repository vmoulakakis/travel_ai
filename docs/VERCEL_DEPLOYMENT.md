# Final production deployment

There is one supported deployment path for this repository:

```text
GitHub main
  -> GitHub Actions CI
  -> Vercel project: travel-ai
  -> production alias
```

## Rules

- `main` is the only production branch.
- Vercel branch deployments are disabled for every branch except `main` in `vercel.json`.
- Do not create additional Vercel projects, temporary production names, bootstrap deployments, Cloudflare workers, or alternate hosting paths for this application.
- Pull requests are validation only; they must not become production.
- A production release is valid only when the exact `main` SHA has passed CI and the public production URL is verified.

## CI gate

The single CI workflow runs:

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run test:strict
npm run build
```

Only a green `main` build may be deployed.

## Runtime

Framework: Next.js 16 / Node.js 22.

Production relies on the existing Supabase backend and the environment contract documented in `.env.example`. Secrets must stay server-side; never expose service-role or model API credentials through `NEXT_PUBLIC_*` variables.

## Vercel cron jobs

`vercel.json` is the single production scheduler and currently invokes:

- `/api/jobs/linkwise`
- `/api/jobs/train-matcher`
- `/api/jobs/seo-audit`
- `/api/jobs/evidence-audit`

Protected jobs require `CRON_SECRET` and fail closed when credentials are missing.

## Release verification

After every production deployment verify:

1. `/`
2. `/en`
3. `/proorismoi`
4. `/en/destinations`
5. `/api/health`
6. one `/api/recommend/stream` request
7. destination images and one stay flow
8. `/icon.svg` / browser favicon

Do not label a release FINAL/LIVE until those public checks pass.
