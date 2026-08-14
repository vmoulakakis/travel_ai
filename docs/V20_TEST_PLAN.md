# V20 test plan

Automated release gates remain cumulative. V20 must pass all V8–V19 behavioral gates plus the new V20 truth smoke.

The V20 smoke checks explicit stock truth for true/null/false values, full-trip date validity, invalid tracking rejection, least-privilege SQL grants, production-truth Edge authentication, health/status release markers, and `in_stock` preservation.

Deployment smoke uses `/api/v20/status` as the authoritative V20 marker and `/api/health` as the public runtime health marker. The canonical alias is verified separately from immutable/preview deployment URLs.
