# SOLO.Chat recovery and free-local-first roadmap

Date: 2026-11-18  
Target repository: `desdesyo/CSS-Bot-Community`  
Target branch: `github-chat-prototype`

This roadmap consolidates the current user directive with the still-open acceptance requirements in SOLO.Chat issues #5, #100 and #110. It is an execution contract, not a claim that the features below are already complete.

## Product contract

SOLO.Chat must remain usable without a mandatory paid AI quota. "Unlimited" means no app-imposed paid-provider request allowance: local inference is free to run subject to available hardware, while cloud providers remain optional and subject to their own quotas. Never fake an unlimited counter or silently accumulate an unbounded backlog. A request is complete only when a persisted assistant reply exists.

Emergency mode is an internal operating state, not a page banner. Remove any prominent emergency text/banner; retain only a small neutral status glyph in the header, with details available through an accessible tooltip/popover. The normal chat layout remains intact.

## Execution order and gates

### Gate 1 — Recover the request lifecycle
- Reproduce stalled/failed browser jobs and Pi provider failures from durable diagnostics.
- Ensure operation IDs are idempotent and each operation has bounded queued/running/finalizing/done/failed states.
- Recover stale work after Worker or Durable Object restart; add bounded retry and cancellation.
- Never silently strand jobs or report delivery without a persisted assistant reply.

**Pass:** real browser chat opens, accepts a message, processes it, persists the assistant reply, and survives reload without duplication.

### Gate 2 — Quiet emergency UI
- Remove full-width or prominent emergency-mode text.
- Use one small neutral header glyph; details are available on interaction and via accessible labels.
- Do not add a second status banner or distort mobile layout.

**Pass:** desktop and mobile UI inspection shows no emergency banner and the status remains discoverable.

### Gate 3 — First-class local inference
- Inspect and repair the existing WebLLM/WebGPU Qwen2.5-0.5B path and the authenticated local-complete endpoint; do not create a duplicate fallback.
- Enter local inference for eligible provider-unavailable, quota-exhausted, open-circuit, timeout and transient upstream errors.
- Never fallback on authentication, invalid input, permission/security failures or cancellation.
- Keep unsupported attachments, web search and tool calls out of text-only local inference.
- Persist local answers through the same operation and conversation record, with idempotent completion and an explicit local-model indicator.
- If WebGPU or device memory is insufficient, report the exact limitation and keep the original draft/request recoverable.

**Pass:** force cloud-provider outage in a real browser and obtain a persisted local answer, or produce a precise device capability failure without losing the request.

### Gate 4 — Honest quota and provider capacity
- Separate user-configurable application request limits from provider quotas, circuit breakers and real inference capacity.
- A zero internal daily cap means no app-imposed cap; it does not create cloud capacity or remove upstream billing.
- Add diagnostics for provider readiness, cooldown, quota exhaustion and last successful inference.
- Never queue indefinitely when no provider/local capacity exists; bound retries and expose a recoverable blocked state.

**Pass:** quota tests prove the distinction and no unbounded queue growth under total provider outage.

### Gate 5 — Free local runtime and provider routing
- Make local inference an optional first-class runtime, with browser WebGPU and an authenticated paired-computer/local-runtime route where supported.
- The local companion must remain opt-in, allowlisted, authenticated, and unable to execute arbitrary shell commands.
- Cloud providers are optional failover routes and may only be used when configured and actually available.
- Basic local chat must not require a paid API key.

**Pass:** documented local setup, real local inference test, and provider fallback tests on supported hardware.

### Gate 6 — Real agent/tool execution
- Repair role-isolated Planner, Implementer, independent read-only Tester and Supervisor Durable Objects.
- Verify real Pi tool discovery/invocation, GitHub project file read, temporary task-branch write/read-back and cleanup.
- Keep repository/branch allowlists and least privilege; never target `desdesyo/modhaul`.
- Verify skill retrieval and evidence-backed promotion; prompt stuffing or scheduled task generation is not learning.
- Supervisor rejects skipped roles, missing SHA, missing tests, wrong branch, stale deployment and unsupported success claims.

**Pass:** non-skipped end-to-end role workflow with exact evidence and no leaked secrets.

### Gate 7 — Persistence and browser continuity
- Verify chat history and cross-chat semantic memory using a non-empty embedding vector and paraphrase retrieval.
- Visible transcript contains only user and assistant roles.
- Browser auto-update preserves draft, selected thread and scroll position.
- Verify attachment upload, retrieval, deletion and size bounds.

**Pass:** live E2E with synthetic records and marker-verified cleanup.

### Gate 8 — Release verification
- Run type-check, regression suite, real browser E2E, local fallback E2E, tool E2E and authenticated health/model/harness/agent dashboard checks.
- Deploy only the exact tested commit SHA; verify the live Worker reports that exact version.
- Record changed paths, root cause, commit SHA, test names/results, workflow run IDs, live endpoints and actual response outcomes.
- Keep recovery/acceptance issues open until every required gate passes.

## Mandatory 4/4 user acceptance

1. Chat opens.
2. User can send a message.
3. SOLO.Chat processes it through cloud or actual local inference.
4. User receives a persisted assistant reply.

All four must pass in a real browser, including a forced cloud-provider outage with local fallback. A green health endpoint, static source test, queued task, synthetic marker or text-only fallback alone is not proof.

## Known evidence at roadmap creation

- The browser source already contains WebLLM/WebGPU Qwen2.5-0.5B fallback and configurable quota settings; these must be repaired and tested rather than duplicated.
- The latest /fix diagnostic in issue #110 reported 32 pending Pi operations, repeated 3/8-minute browser timeouts, provider `model_error` with no tool calls, and an open Workers AI circuit.
- Issue #100 still requires verified role-isolated Pi tool execution, real GitHub tool calls, cross-chat semantic memory, draft-preserving browser update, synthetic-data cleanup and full Planner → Implementer → Tester → Supervisor execution.
- Existing architecture documentation correctly states that cloud inference cannot be made unlimited by changing an internal counter.

## Evidence log

Append only verified outcomes. Never mark a gate complete based on source presence or an unverified deployment.
