# Find Your Casino Intelligence

An internal, non-commercial Senior Product Manager interview prototype. It preserves the Casino.org Fastest Withdrawals page captured in Chrome on **30 October 2026** and adds a local, explainable comparison assistant. This is not an official Casino.org deployment. It is hosted as a demonstration on GitHub Pages.

## Open the demo

**Live demo:** https://pixellainc-rgb.github.io/CORG-AI-Initiative-Task-Omar-Zawia/

Start with [the interview demonstration journey](DEMO-SCENARIOS.md).

**Open `dist/standalone.html` manually in Chrome for the single-file version.** It embeds its styles, scripts, fonts and images. Alternatively, open `dist/index.html` with its neighbouring files intact. No package installation, build, account, API key, internet connection or development server is required for the core experience. Supporting source links and original-site navigation require internet access when clicked.

Optional local HTTP preview, from this project directory:

```sh
python3 -m http.server 8767 --bind 127.0.0.1 --directory dist
```

Then open http://127.0.0.1:8767/ in Chrome. Files opened directly and HTTP previews have separate browser-local analytics storage.

## Demonstrate it

1. Open **Find My Casino** beneath the original introduction.
2. Choose one of the four scenario buttons, or type your own priorities. Country can be selected or stated in natural language; a missing country triggers one essential follow-up.
3. Inspect the shortlist, **Why this match?**, and **Evidence**. Checked options are available under **Compare**.
4. Ask a follow-up such as “Why did you recommend PlayUZU?” or “Use PayPal instead.”
5. **View listing** returns to and highlights the original card. **Visit Casino · Demo** shows a local confirmation; it never follows an affiliate link.
6. Open **Demo analytics** while the assistant is closed, or use **How it works → View local demonstration analytics** while inside it. Export the events as JSON if needed.

See `DEMO-SCENARIOS.md` for a presentation script and expected outcomes.

## What was replicated

Reference: https://www.casino.org/payment/fastest-withdrawals/

The actual browser session showed an English page with Spanish operator offers. That version is frozen throughout this prototype. The original ordering is:

1. Platincasino
2. bwin Casino
3. Casino777
4. 44Aces Casino
5. TonyBet Casino
6. PlayUZU Casino
7. Casino Gran Madrid
8. Betinia Casino
9. Luckia Casino
10. LeoVegas Casino

The captured DOM, source styles, local Inter font, artwork, logos, article sections, original comparison table and footer were retained. The feature is a separate scoped layer. There are **196 local image/font/stylesheet assets** and 41 referenced inline icon symbols. The baseline page `dist/reference-replica.html` omits the new entry section and prototype badges so it can be visually compared with the source.

Working local replacements include responsive navigation, section anchors, top-card details, FAQ accordions, brand navigation, the illustrative amount calculator, bonus carousel navigation, back-to-top and country links. Editorial/navigation links open the original destinations. Real accounts, original membership functionality, remote widgets, tracking scripts and actual gambling are outside this prototype; the account icon displays a limitation notice.

### Intentional differences and limits

- All original casino clickouts were replaced with clearly labelled local demonstration actions. Original affiliate URLs and analytics scripts are absent from the compiled demo.
- A few source passages implying risk-free bonus play or encouraging larger deposits were made neutral. Their surrounding structure is preserved. Calculator arithmetic is explicitly illustrative, not a verified current offer.
- Source “win rate” values and bonus amounts remain visible only in the frozen source replica. They are **not** treated as personal winning probabilities or recommendation evidence.
- Source method lists contain inconsistencies: a deposit logo is not proof of withdrawal support. The assistant uses separately attributed supporting evidence instead.
- No operator-specific Casino.org review URLs were established from the captured page. They remain null; recommendations link to the original listing and accessible primary sources rather than guessed reviews.
- One background asset belonging to an unrelated embedded games promotion could not be exported through the browser inventory; it is omitted. All visible page images in the tested desktop and mobile states loaded locally.
- The entire mobile page exceeds Chrome's single-image capture limit in this environment. Full-page mobile screenshots were composed from three non-overlapping, full-width browser screenshot clips. The separate assistant screenshots are ordinary viewport captures.
- This is a close snapshot reproduction, not a claim of perfect identity across future website updates or every third-party interaction. Desktop baseline height differs slightly because of the disclosed copy and demonstration-label changes.

## What is verified, simulated and unknown

**Mode A is fully functional deterministic logic, labelled “Simulated AI.”** `dist/matcher.js` interprets natural-language preferences, applies evidence gates, scores matching attributes and returns up to three results. It does not call a language model, browse live websites, infer hidden eligibility or claim to have tested withdrawals.

`dist/operator-data.json` is the reusable structured dataset. Its browser equivalent, `operator-data.js`, is loaded as a classic script so the demo also works from `file://` without fetching JSON. Each substantive field stores:

```json
{
  "value": "published fact or structured value; null when unknown",
  "verified": true,
  "confidence": "source-quality annotation",
  "sourceUrls": ["https://primary-source.example/"],
  "accessedAt": "2026-10-30",
  "note": "relevant qualifications"
}
```

“Verified” means the public source was checked and the statement attributed, **not independently tested**. Source publication dates can predate the access date. The detailed source notes identify older, conflicting and inaccessible material. There are 25 supporting/reference source records in `research/operator-evidence.json`.

- **Jurisdiction:** supporting records exist for the exact Spanish domains only. All other countries and missing country information return no eligible shortlist. A regulator/domain record is not individual eligibility approval. Age, residence/location, self-exclusion, identity and other operator conditions still apply.
- **Payments:** positively evidenced withdrawal methods only. Deposit-only logos do not qualify.
- **Timing:** processing and post-approval settlement are separate. Claims such as “most withdrawals in minutes” are labelled operator claims. There is no verified guaranteed end-to-end SLA in this dataset; strict timing demands fail closed.
- **Amounts:** a withdrawal-amount requirement needs evidenced numeric minimum and maximum for an appropriate method. Unknown limits do not mean unlimited. An unspecified limit period remains unspecified.
- **Verification:** no operator is represented as KYC-free. Explicit requests to bypass identity checks return no match.
- **Bonuses:** published policy is distinguished from current offer-specific terms. No guessed current bonus amount enters the assistant's scoring.
- **Games:** matching uses evidenced visible categories, not inferred catalogue size.
- **Safety:** under-18, self-exclusion and chasing-loss requests do not receive recommendations.
- **Ranking:** preference fit and evidence clarity determine the simulated order; original ranking, sponsorship and headline bonus amounts do not determine it. The prototype does not certify the original page's commercial arrangements.

Unknown information is shown as “Not verified” or explained in the information-gap list. Source contradictions are retained in the evidence notes. No current operator terms are guaranteed by the snapshot.

## Local demonstration analytics

Eight required event types are generated:

`ai_assistant_opened`, `user_preferences_submitted`, `ai_shortlist_generated`, `recommendation_explanation_viewed`, `evidence_link_clicked`, `casino_comparison_opened`, `casino_selected`, `assistant_closed`.

Each event includes an ISO timestamp, anonymous browser-session identifier and contextual properties. Up to 500 events are retained in localStorage, shown in the developer panel and logged to the console. Raw natural-language messages are not persisted in analytics. No data is sent to a server. Storage failures fall back to memory. **Clear local events** removes the locally retained event list.

The prototype measures demo selections, not real affiliate clickouts or First-Time Depositors. It never claims qualified FTD attribution.

Proposed production measures, to align with stakeholders:

| Measure | Proposed operational definition |
| --- | --- |
| Informed Choice Rate | Eligible assistant sessions with an evidence view or comparison followed by an explicit selection, divided by eligible assistant sessions; validate this proxy with user research |
| Shortlist completion | Eligible preference submissions producing a non-empty shortlist / eligible preference submissions; report legitimate no-match outcomes separately |
| Comparison-to-clickout | Unique comparison sessions with a consent-aware real clickout / unique comparison sessions |
| Decision confidence | Optional post-comparison self-report; report response rate and baseline/control results |
| Qualified FTDs per 1,000 visits | Deduplicated, partner-confirmed qualified first deposits / eligible visits × 1,000; requires real partner attribution and is not measured locally |

## Implementation and production path

- `dist/index.html`: static page structure using neighbouring assets.
- `dist/standalone.html`: single-file version with inlined assets and hash-authorised local scripts.
- `dist/assets/`: local captured assets; no third-party scripts.
- `dist/intelligence.css`: scoped feature styles; responsive desktop/mobile modal.
- `dist/intelligence.js`: conversation, shortlist, comparison, evidence, linking and local analytics.
- `dist/matcher.js`: pure matching engine, browser global and CommonJS export.
- `dist/replica-interactions.js`: local replacements for original-page interactions.
- `dist/operator-data.json` / `.js`: field-level evidence and original listing identity.
- `research/`: supporting primary sources and limitations.
- `screenshots/`: source, baseline, integrated page, assistant, comparison, analytics and no-match captures.
- `tests/`: meaningful matching and package checks.
- `PRODUCTION-INTEGRATION.md`: secure Mode B architecture and editorial requirements. No model credentials are present.

For production, use the existing Casino.org design system and operator data platform rather than deploying this cloned DOM. Add current data feeds, human editorial/Compliance approval, jurisdiction rules beyond country alone, source expiry, account/method conditions, accessibility review, security/privacy controls, real analytics/partner attribution and controlled experimentation. The compiled demo's CSP intentionally prohibits backend connections.

## Validation

Run the focused pure-engine tests with any recent Node.js:

```sh
node --test tests/matcher.test.cjs
```

The recorded run passed **16/16** tests. Chrome UI verification and screenshot details are recorded in `qa-results.json` and `screenshots/`. Both the regular and self-contained versions were checked over local HTTP. Browser automation rejected direct `file://` navigation because its URL policy allows HTTP/HTTPS only, so opening the single file manually is a remaining verification limit. No security warning or browser restriction was bypassed. No real account, payment, deposit, game or withdrawal was performed.

## Rights and distribution

Casino.org branding, source content, images and source styles remain the property of their respective owners. They are retained here only for the requested internal, non-commercial interview demonstration. Do not publish this replica as an official page or imply endorsement. Obtain necessary permissions and review before any external distribution.
