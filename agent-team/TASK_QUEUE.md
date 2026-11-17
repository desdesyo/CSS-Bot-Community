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
