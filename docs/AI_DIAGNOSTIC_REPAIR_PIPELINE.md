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


## AI repair PR workflow (implemented)

Workflow `.github/workflows/ai-repair-pr.yml` also runs when the `ai-repair` label is added.

1. It checks out `sdk-foundation` and reads the issue description plus tracked C++ source/test files.
2. It asks the OpenAI Responses API for a minimal unified diff. Issue text and logs are explicitly treated as untrusted evidence.
3. It applies the patch on an isolated `ai/issue-N` branch.
4. It rejects changes outside `src/` and `tests/`.
5. It runs CMake build and CTest.
6. Only if the patch applies and all tests pass, it opens a pull request for human review. It never merges automatically.

If no safe patch is produced, it comments on the issue and leaves source unchanged.

### Required setup

Add repository Actions secret `OPENAI_API_KEY`. Enable Actions and permit the repository's `GITHUB_TOKEN` to create pull requests (Settings → Actions → General → Workflow permissions).

### How to use

Create a GitHub issue with expected vs actual behavior, reproduction steps, game/build/commit details, and relevant sanitized `cssbc_ai.jsonl` excerpts. Add label `ai-repair`. The existing triage workflow posts a diagnosis; the repair workflow independently attempts a constrained patch and, if tests pass, opens a PR.

### Safety and limits

- No auto-merge; a maintainer must review the patch.
- AI may change only `src/` and `tests/`; workflow, installer, secrets and dependencies are outside its allowlist.
- Only tracked C++ source and test files plus the issue are sent as context; the full runtime log is not automatically fetched from the game server.
- The SourceMod event logger currently records observable game events, not private bot decision state or full navigation reasoning.
- A passing portable CMake/CTest run does not prove compatibility with a live CS:S server or a community SDK fork.
