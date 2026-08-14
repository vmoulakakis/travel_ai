# V20 compatibility note

The existing final handoff keeps its legacy top-level `FEED_CONFIRMED` status for client compatibility. V20 adds `availabilityTruth` as the authoritative fine-grained interpretation. A future UI-only revision can render the distinction directly without changing feed eligibility or recommendation ranking.
