# Development log

## 2026-09-10 — Repository initialization

- Renamed HomeTruth to Under the Roof at the user's request.
- Astra inspected the empty repository and selected a minimal Next.js/API/in-memory evidence architecture.
- Initial workspace commands stalled. A later clone failed with permission denied; explicitly approved escalation succeeded.
- PowerShell blocked npm.ps1; use npm.cmd without changing execution policy.
- Verified the Astra model and function-calling API against official OpenAI documentation.
- No API key was available in the environment. Live model verification is pending local configuration; offline tests must not be described as live Astra evaluations.
- Grounding analysis: existing evidence IDs alone cannot establish semantic support. P0 will require exact source quotations for factual statements and separately labeled inferences; deterministic guards remain limited, not a semantic truth guarantee.
