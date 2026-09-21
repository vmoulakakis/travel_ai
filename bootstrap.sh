#!/usr/bin/env bash
set -euo pipefail

# Vercel production build: run the actual Next.js build wrapper directly.
# CI owns smoke/regression tests; npm lifecycle prebuild must not block deployment.
node scripts/build-with-vercel-bootstrap.mjs
