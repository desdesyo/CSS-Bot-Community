# ChatGPT-style feature parity — implementation contract

This document is the source of truth for expanding the standalone chat. The goal is a capable, continuous assistant experience, not a visual mockup. Every visible control must call a working backend operation. Features that need external credentials or infrastructure must be clearly treated as deployment dependencies, never faked.

## Non-negotiable product requirements

- One continuous conversation identity. Context rollover, model failover, and storage pagination remain invisible to the user.
- No VPN, proxy, browser geolocation, country selector, or client-side region-based behavior.
- Provider routing and failover are server-side. Do not claim worldwide reachability until verified from multiple networks.
- No artificial application-level message count cap. Practical limits imposed by model context, provider quotas, payload sizes, storage, and abuse prevention must be handled transparently and safely.
- User content and credentials stay private. Secrets never ship to the browser. Conversation storage must be a dedicated private store, not this public source repository.
- Do not render a control until its complete operation exists. No fake buttons or placeholder features.
- Provider/model safety rules, law, account permissions, and upstream service restrictions cannot be bypassed.

## User's clarified core requirement — priority order

The product is primarily an **agent workspace**, not merely a chat UI. Its core job is to:
1. Create real downloadable files and artifacts from user instructions.
2. Accept user uploads, inspect their contents, analyze them, compare versions, extract facts, and cite the relevant source.
3. Search the live internet, evaluate sources, synthesize findings, and provide links.
4. Follow user instructions and requests through multi-step work, keeping task state and reporting what was actually completed.
5. Analyze datasets, explain findings, recommend solutions, and propose viable alternatives when a requested route is blocked or constrained.
6. Distinguish a hard external blocker from a solvable constraint; try a safe alternative instead of stopping at the first limitation.

Priority is functional tool execution and finished artifacts over cosmetic feature parity. The agent must not pretend to create, upload, browse, execute, or analyze something when it did not actually do so. Every tool action needs an auditable result. For risky or destructive actions, request confirmation; for read-only research and reversible file creation, proceed when authorized.

### First delivery milestones

- **M1 Files**: private object storage; upload, list, download, delete, text/CSV/JSON inspection; generated artifact creation; attachment-aware chat.
- **M2 Web research**: live search API, source metadata, links, freshness, source quality comparison, citations in responses.
- **M3 Data analysis**: deterministic CSV statistics and charts, then isolated execution service for broader Python/R/SQL workloads; export results.
- **M4 Agent orchestration**: model tool-calling loop, task plan/state, retries, idempotency, progress persistence, verification, fallback paths.
- **M5 Reliability and privacy**: per-user identity and ownership, private storage, backups, limits, audit trail, integration tests, production monitoring.

External dependencies must be named in setup instructions: R2-compatible private storage, web-search provider credentials, and an isolated analysis runtime for arbitrary code. Never ship fake buttons to imply these dependencies are already configured.

## Feature inventory and implementation status

Status vocabulary: Implemented = code path exists; Partial = incomplete or not end-to-end verified; Planned = not implemented; External dependency = requires a provider, credential, or infrastructure service.

| Capability | Required behavior | Current status |
|---|---|---|
| Continuous text chat | Send/receive, persistent threads, reload restoration | Partial: basic path exists; not deployed or end-to-end tested |
| Long-context continuity | Summaries, automatic internal continuation, no visible new chat | Partial: rollover boundary now preserves the submitted turn; continuation traversal is paginated and follows up to 100 segments; stress/concurrency tests missing |
| Model routing/failover | Primary + independent compatible fallback, retries, server-side routing | Partial: optional fallback exists; no provider health/circuit-breaker |
| Streaming responses | Token streaming, cancel generation, reconnect without duplicate turns | Planned |
| Message actions | Edit/resend, regenerate, copy, delete, retry failed turn | Planned |
| Rich text | Safe Markdown, headings, lists, links, inline code, fenced code, copy/save actions | Partial: safe basic Markdown and code blocks; tables and syntax highlighting remain |
| File creation | Assistant creates real downloadable artifacts from instructions | Partial: server-side create-file tool and save-answer-as-Markdown; format templates/large artifact workflow remain |
| GitHub workspace | Agent lists, reads, creates, and updates repository files with auditable commits | Partial: optional configured repo + path-root restriction; UTF-8 text only, 900 KB write cap; requires token Contents permissions; no binary Git data API or branch creation yet |
| Attachments | Upload, download, remove, attach multiple files, size/type validation | Partial: private R2 upload/download/delete, multi-file attach, 15 MB cap; library pagination added; no full file manager yet |
| Document understanding | PDF, text, DOCX/XLSX/CSV and image extraction with citations to uploaded files | Partial: text/CSV/JSON/source files plus PDF input to primary model; DOCX/XLSX/OCR pipeline pending |
| Image understanding | Attach images and ask questions about them | Partial: image input to primary Responses API model; no image editing/generation |
| Image generation/editing | Generate and edit images, persist outputs in conversation | Planned; image provider + object storage required |
| Web search | Server-side search tool, citations, source links, recency controls | Partial: Brave Search server tool + opt-in UI toggle; requires API key and source verification tests |
| Data analysis | Sandboxed execution, CSV/XLSX analysis, charts, downloadable artifacts | Partial: deterministic CSV row/column and numeric summaries; isolated runtime, XLSX, charts pending |
| Voice input/output | Speech-to-text, spoken responses, interruption and playback controls | Planned; speech provider/browser support required |
| Memory | User-controlled durable facts, inspect/update/delete, source and scope controls | Planned; private memory store required |
| Projects | Group chats/files/instructions by project | Planned |
| Custom assistants | User-created instruction profiles and knowledge files | Planned |
| Connectors | OAuth-based integrations, least-privilege permissions, revoke access | Planned; each integration requires its own API and authorization |
| Tasks/automation | Scheduled or conditional background tasks, status and cancellation | Planned; scheduler/queue required |
| Search in history | Full-text search across user's conversations and files | Planned |
| Export/import | Export chat as JSON/Markdown; import supported formats | Planned |
| Account/security | Individual identity, sessions, password reset, rate limits, audit trail | Partial: shared password gate; not suitable for multi-user public use; ownership/rate limits pending |
| Accessibility/mobile | Keyboard navigation, responsive layout, screen-reader labels | Partial: basic responsive layout only |
| Localization | Russian and English interface, per-user language setting | Planned |
| Reliability/observability | Health checks, retries, idempotency, queue, backups, error telemetry without leaking content | Partial |

## Target architecture

1. **Web client**: responsive chat UI, streamed messages, safe Markdown, attachment manager, project/history navigation.
2. **API gateway**: Cloudflare Worker or equivalent, session authentication, authorization, quotas, request validation, idempotency.
3. **Conversation service**: durable message store with stable conversation IDs, cursor pagination, internal context compaction and continuation.
4. **Model router**: provider adapters, model capability registry, timeout/retry policy, circuit breaker, fallback and cost accounting. Provider choice is never exposed as a location requirement.
5. **Object storage**: private R2-compatible bucket for uploads and generated artifacts; short-lived signed access.
6. **Tool services**: web search, document parsing, sandboxed data analysis, image generation, speech, connectors.
7. **Background workers**: scheduled tasks, long-running jobs, attachment processing, cleanup and retries.
8. **Security boundary**: no arbitrary shell execution from chat; any future local PC bridge remains separately authenticated, allowlisted, auditable and least-privilege.

## Acceptance criteria

- Every feature advertised in the UI has a real API route and a successful integration test.
- A user can keep one logical conversation through context compaction and provider switching without losing prior decisions.
- A failed provider does not lose or duplicate the user's message; idempotency keys prevent duplicate turns.
- Browser code contains no provider secrets and does not require VPN/proxy or location permission.
- Uploaded files are private, validated, size-limited, scanned/parsed in isolated workers, and removable by the owner.
- Web-search claims carry source links; file-derived claims can point to file/page/section.
- Data analysis runs in an isolated sandbox with strict CPU, memory, time, filesystem, and network limits.
- User can inspect, export, and delete conversations and stored memory.
- Tests cover authentication, authorization, retries, rollover, failover, uploads, tool errors, and concurrent requests.
- Deployment is not called complete until production secrets, private storage, domain, provider access, backups, and external-network smoke tests are verified.

## Known non-negotiable external limits

A standalone app cannot reproduce OpenAI's private ChatGPT infrastructure or grant access to proprietary models/tools without authorized provider access. It cannot promise unlimited inference, unlimited context, universal country/network reachability, or bypass upstream safety, legal, account, or quota restrictions. The implementation target is broad feature coverage with no arbitrary product-side restrictions, while accurately respecting these external boundaries.
