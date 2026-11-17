# Autonomous Agent Team

The team is an auditable GitHub Actions orchestration pipeline backed by SOLO.Chat's Durable Object agent runtime. Roles are separate workflow stages and conversation threads; they are not separate permanently running servers or guaranteed different model instances.

## Roles and actual responsibilities

1. **Task Generator** (`.github/workflows/agent-task-generator.yml`)
   - Runs on schedule/manual dispatch.
   - Converts the next unissued roadmap queue item into a GitHub Issue.
   - Uses stable task keys to avoid duplicate open tasks.
   - Does not claim to invent new roadmap work.

2. **Orchestrator / Builder** (`.github/workflows/agent-orchestrator.yml`)
   - Accepts queued task issues and failed CI/deployment runs.
   - Moves issues from queued to in-progress.
   - Sends bounded work to SOLO.Chat using a per-task durable thread.
   - Collects the execution report and moves non-blocked work to review.
   - Automatically creates a repair issue for failed build/test/deployment workflows.

3. **Tester** (`GitHub Chat checks`, `CSSBC Core CI`, deploy smoke test)
   - Runs regression tests and type checks.
   - Deploy workflow performs an authenticated live health/version check after deployment and rolls back the previous Worker version only if that core health gate fails.
   - A separate post-deploy step verifies the live agent dashboard and actual model inference. Model failures trigger the repair workflow without rolling back a healthy Worker version.
   - Failed checks trigger the orchestrator repair path.

4. **Supervisor / Reviewer** (`.github/workflows/agent-supervisor.yml`)
   - Checks issue lifecycle structure and evidence requirements.
   - On review-state tasks, starts a separate read-only review conversation.
   - Reviewer inspects acceptance criteria, current branch commit and CI evidence; insufficient evidence is REJECT.
   - Review results are keyed to the current commit and CI state so later CI completion triggers a fresh review.
   - The reviewer uses the same SOLO.Chat runtime/provider and credentials, but a separate durable conversation. This is role separation, not a security-isolated second model.

5. **Health Monitor** (`.github/workflows/agent-health-monitor.yml`)
   - Checks the authenticated deployed health endpoint every 10 minutes and after relevant workflow runs; runs a live model smoke test once per hour.
   - Creates or updates one deduplicated self-heal task when the service is unavailable.
   - If the app itself is offline, the monitor can report/queue a task but cannot call the unavailable in-app model; recovery then depends on GitHub Actions and available deployment credentials.

## Task lifecycle

`queued → in-progress → review → done`

A task is never marked done solely because the builder returned a message. The independent reviewer must return PASS with evidence; the task still remains in review until a verified completion policy is satisfied. Failed tests/deployments create a new repair task. CI is authoritative for automated checks, not agent self-report.

## Live interface updates

The browser polls the authenticated Worker version endpoint every 30 seconds. When the Cloudflare version changes, it reloads after the current generation ends and the composer is empty. It preserves the current conversation and any unsent draft. The agent dashboard reads actual GitHub Actions runs and shows links to the runs; it does not simulate green status.

## Safety and limits

- No self-modifying production deploys without CI and a post-deploy smoke check.
- No credentials are stored in repository files.
- The AI reviewer is a separate read-only instruction pass, not a separate permission boundary.
- GitHub Actions workflows cannot inject events into the user's active ChatGPT conversation; the issue queue is the handoff channel.
- If the deployed Worker is entirely unreachable, the monitor can create a GitHub repair issue but cannot use the same unavailable Worker to repair itself.
- Canonical app: [SOLO.Chat](https://cssbc-github-chat.descapan.workers.dev/).
