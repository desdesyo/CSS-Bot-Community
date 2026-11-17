# Autonomous Agent Team

Three cooperating roles for the GitHub Chat project. This is workflow automation, not three independent LLM instances.

## Roles

1. **Task Generator** (`.github/workflows/agent-task-generator.yml`)
   - Runs on schedule and manual dispatch.
   - Creates one actionable task Issue from `agent-team/TASK_QUEUE.md`.
   - Uses labels `agent-task`, `agent-generated`, `status:queued`.
   - Avoids duplicate open generated tasks by stable task key.
   - Does not invent scope or modify production code.

2. **Builder + Tester** (GitHub Chat CI and AI Tester Inbox #4)
   - CI validates code and runs the Chat Tester.
   - Failure report is posted to Issue #4 with commit/run links.
   - The chat agent can inspect the failure and implement a fix on the development branch; CI then verifies it.

3. **Supervisor** (`.github/workflows/agent-supervisor.yml`)
   - Runs on schedule/manual dispatch.
   - Checks task issues for required labels, task key, acceptance criteria and evidence fields.
   - Adds a supervision report/comment and labels violations `agent-review-needed`.
   - Does not silently close tasks or approve unverified work.

## Task lifecycle

`queued → in-progress → review → done`

A task is only done when implementation evidence and a successful relevant check are linked. A failed test returns it to `in-progress` and must link the tester report. The supervisor is a policy checker; it does not pretend to be an AI code reviewer.

## Safety and limits

- Generated tasks are bounded to the roadmap queue; no arbitrary production changes.
- No secrets are stored in repository files.
- CI tokens have minimum permissions.
- A GitHub Actions workflow cannot inject events into this ChatGPT conversation. Issues are the automatic handoff channel; an active assistant session must read and act on them.
- The current Task Generator selects a queued roadmap item; it does not use an LLM to brainstorm unlimited new work. This keeps tasks reviewable and prevents task spam.
