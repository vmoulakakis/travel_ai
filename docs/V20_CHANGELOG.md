# V20 changelog

- Preserve feed `in_stock` instead of collapsing unknown stock state.
- Add explicit five-state accommodation availability truth classifier.
- Expose availability truth in final stay recheck without breaking the current handoff contract.
- Add service-role-only aggregate production truth RPC.
- Add protected `production-truth-v20` Edge Function.
- Revoke public/anon/authenticated execution of the privileged V15 stay-city RPC.
- Upgrade `/api/health` to V20 production-truth verification.
- Add `/api/v20/status` for deployed-commit and evidence-coverage verification.
- Add evidence depth and persistent evidence counts rather than implying the corpus is complete.
- Add `test:v20:truth` to the permanent strict release gate.
