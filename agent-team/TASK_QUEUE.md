# Task Generator queue

One task per line in this format:
- `key | title | objective | acceptance criteria`

The generator takes the first key that has not already been issued as an open `agent-generated` task.
Keep tasks small, testable, and safe. Do not put secrets here.

## Initial queue
- CHAT-001 | Make chat tester fail reliably | Ensure tester assertion failures make CI fail and report exact failed checks | CI exits nonzero on any failed assertion; report artifact and inbox comment contain the failing output
- CHAT-002 | Add agent task status protocol | Document queued/in-progress/review/done states in task issues | issue template requires acceptance criteria, implementation evidence, and verification run
- CHAT-003 | Strengthen chat runtime regression tests | Add focused tests for auth, session persistence, and tool permission boundaries | tests cover positive and negative cases; CI executes them
- CHAT-004 | Improve supervisor audit | Make supervisor report missing evidence and invalid status transitions | audit report identifies issue number, violations, and required remediation
- CHAT-005 | Verify deployed chat health | Add a safe authenticated deployment smoke test where credentials are available | workflow skips clearly when secret absent and never prints credentials

- CHAT-006 | Add negative-path auth regression coverage | Verify malformed, expired, and unauthorized sessions are rejected without leaking auth state | automated tests cover unauthorized API access, expired remembered-device cookies, logout invalidation, and rate-limit behavior
- CHAT-007 | Add follow-up concurrency stress coverage | Exercise rapid follow-up submissions during running and finalization states | tests prove accepted messages are never lost, finalizing requests receive deterministic conflict responses, and the 20-message cap is enforced
- CHAT-008 | Add agent tool-boundary evaluation | Verify tool permission checks and untrusted-content handling under adversarial inputs | tests cover read-only MCP enforcement, path traversal rejection, secret redaction, and untrusted repository instructions
- CHAT-009 | Add durable learning quality gate | Prevent unverified or duplicate procedures from becoming trusted reusable skills | skill candidates require reproducible evidence, applicability checks, and a successful repeat verification before promotion
- CHAT-010 | Add model behavior benchmark cases | Evaluate task execution, clarification discipline, evidence honesty, and recovery from tool errors | versioned benchmark scenarios produce a scored report and fail CI when critical behavior regresses
- CHAT-011 | Add multi-turn context retention tests | Verify goals, constraints, corrections, and follow-up instructions survive long conversations and rollover | tests confirm summary and continuation preserve user constraints and latest follow-ups
- CHAT-012 | Add deployment-domain smoke checks | Verify configured custom domain DNS, HTTPS, Worker routing, and health endpoint after deployment | workflow checks DNS resolution, TLS response, and authenticated app health; reports exact failing layer
- CHAT-013 | Add skill retrieval relevance tests | Ensure the agent loads only relevant skills and does not apply stale procedures blindly | tests cover skill lookup, version/prerequisite mismatch, and mandatory re-verification
- CHAT-014 | Add agent repair-loop regression tests | Verify failures are diagnosed, corrected, and re-tested rather than reported as completed | simulated tool and CI failures result in repair attempts and no false-success response
- CHAT-015 | Add load and queue fairness tests | Stress multiple concurrent jobs and queued follow-up messages | tests verify bounded processing, no cross-thread message leakage, deterministic job ordering, and recovery after timeout
