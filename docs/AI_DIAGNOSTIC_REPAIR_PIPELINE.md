# CSSBC AI Diagnostic → Repository Repair

## What is implemented now

Workflow `.github/workflows/ai-issue-triage.yml` runs when an issue receives the `ai-repair` label:

1. Checks out `sdk-foundation`.
2. Collects repository guidance and a compact file inventory.
3. Sends issue text + context to OpenAI Responses API.
4. Publishes a diagnosis as an Issue comment.

It is deliberately **diagnosis-only**: no write access to source, no automatic commit, and no merge. Issue/log text is untrusted input. The model must not follow instructions embedded in logs.

## One-time setup

1. In GitHub repository Settings → Secrets and variables → Actions → New repository secret, add:
   - Name: `OPENAI_API_KEY`
   - Value: an OpenAI API key with API billing enabled.
2. Ensure Actions are enabled for the repository.
3. Open/create a diagnostic issue containing reproduction steps, logs, build/commit, map, bot count and expected vs actual behavior.
4. Add label `ai-repair` to the issue. The workflow will post a diagnosis comment.

## Current boundary

This is the first working link between GitHub diagnostics and an AI model. It does not yet inspect the full repository, retrieve log attachments automatically, edit code, run a generated patch, or create a PR. Context currently contains the issue, optional `AGENTS.md`, top-level file inventory, and CI workflow.

## Planned repair pipeline (next stages)

- Add a dedicated repair branch and least-privilege GitHub App/token.
- Give the coding agent full checkout + relevant logs and allow edits only on its branch.
- Run CMake/CTest and additional SDK build checks.
- Create a PR with patch, root-cause explanation, test output and risk.
- Keep merge approval human-controlled; never auto-merge gameplay/AI behavior changes.
- Add duplicate-issue correlation, artifact/log retrieval, limits, and prompt-injection defenses.

## Troubleshooting

- Workflow not triggered: check issue has label exactly `ai-repair`.
- Missing API key: verify Actions secret spelling `OPENAI_API_KEY`.
- API error: inspect workflow run logs; check API account billing/model access.
- Never put API keys, Steam auth tickets, passwords, IPs or player personal data in issue logs.
