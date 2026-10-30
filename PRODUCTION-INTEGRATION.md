# Optional Mode B: secure model integration

Mode A remains functional without this architecture. No real model integration is claimed or shipped in the static demo. Do not put credentials in `dist/`, HTML, a public JSON file, browser storage or a bundled environment file.

## Proposed data flow

1. The browser submits a bounded preference object to an authenticated, rate-limited first-party backend (`POST /api/casino-comparison`). Obtain appropriate consent and minimise data collection. Personal account, identity, financial or sensitive data is unnecessary for this initial comparison.
2. The backend loads an editorially approved, current operator dataset. It applies jurisdiction, age/exclusion and other applicable eligibility rules, supported methods, source freshness and hard preference filters **before** calling a model.
3. Supply the model only the filtered verified facts, stable fact IDs, source IDs, explicit unknown values and user preferences. Treat all user text and fetched source text as untrusted data, not instructions. Do not allow a model to invent or override operator eligibility.
4. Request a structured response referencing operator IDs and fact IDs, with no free-form URLs. Generate actual source links from the trusted source registry, not from model output.
5. Validate every returned operator and cited fact against the allowed set. Reject unknown IDs, unsupported assertions, claimed guarantees, invented amounts or removal of material restrictions. Reapply all hard rules after validation.
6. If the model is unavailable, ungrounded or produces invalid output, use deterministic Mode A with an explicit label, or return an honest no-match/temporarily unavailable state.
7. Log only consent-appropriate operational metadata. Exclude raw messages by default; establish retention, deletion, security and access policies. Trace recommendations to dataset version, editorial approvals, source timestamps and model/prompt version.

## Example response contract

```json
{
  "datasetVersion": "editorially-approved-version",
  "status": "shortlist",
  "followUpQuestion": null,
  "recommendations": [
    {
      "operatorId": "operator-from-filtered-dataset",
      "matchedFactIds": ["operator.withdrawalMethods.paypal"],
      "considerationFactIds": ["operator.withdrawalLimits.unknown"],
      "sourceIds": ["approved-primary-source-id"]
    }
  ]
}
```

Allowed statuses should include `needs_jurisdiction`, `shortlist`, `no_verified_match`, `blocked_request`, and `temporarily_unavailable`. At most three recommendations. A needs-jurisdiction question does not return recommendations. Missing information remains unknown and cannot satisfy hard requirements.

The safest initial model role is intent extraction and wording grounded in validated facts. Keep country eligibility and numeric/payment constraints in deterministic backend rules. Where narrative wording cannot be validated adequately, render reviewed templates around the cited fact IDs.

## Source/data platform requirements

- Exact operator legal entity and domain per jurisdiction; country alone is insufficient for markets with state/province, residency or physical-location restrictions.
- Current licensing records and relevant eligibility conditions, including self-exclusion and applicable age restrictions. A public domain record does not approve an individual player.
- Method-specific deposits vs withdrawals, processing vs settlement, fees, numeric limits and their periods, verification dependencies and offer-specific terms.
- Field-level provenance, access/publication dates, expiry policy, conflict handling and human editorial/Compliance approval. Quarantine stale or contradictory critical data.
- A reviewed policy for responsible-gambling signals; do not optimise recommendations toward losses, increased deposits or gambling frequency.
- Distinguish paid placement, editorial rank and preference-based alignment. Do not insert sponsorship as a hidden recommendation weight.
- Evidence explaining the uncertainty of published targets and operator claims. Never silently convert them into independent test results or guarantees.

## Frontend integration seam

The UI already separates evidence data, pure matching and rendering. Replace the call to `CasinoMatcher.rankOperators` with a backend adapter returning the same validated result shape. Keep Mode A available as a labelled fallback. Introduce a backend-specific CSP `connect-src` allowlist only for the approved first-party service; the distributed static prototype deliberately has `connect-src 'none'`.

## Production measurement

Implement consent-aware first-party events with session-level deduplication, experiment assignment, defined eligible denominators and data retention rules. Obtain partner-confirmed clickout/FTD records through an approved attribution contract; verify consent, reconciliation delays, qualification definitions and fraud/deduplication. Measure informed decisions and confidence alongside commercial outcomes, with responsible-gambling guardrails. No local demonstration event establishes an FTD.
