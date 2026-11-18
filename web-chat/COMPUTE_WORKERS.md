# SOLO.Chat Distributed Compute workers

The live SOLO.Chat Durable Object is the coordinator. Tasks submitted in the **SOLO Compute** panel or by the agent are stored in Durable Object storage; connected Node.js workers poll the authenticated Worker API. No separate VM, public coordinator server, or paid cloud host is required.

## Submit a task

1. Open https://cssbc-github-chat.descapan.workers.dev/ and sign in.
2. Open **SOLO Compute** in the composer toolbar.
3. Choose **Проверка SOLO.Chat (Node.js)** or **Сборка и тесты C++**.
4. Click **Отправить задание**. SOLO.Chat resolves the current `github-chat-prototype` commit SHA on the server and queues the task.
5. The panel shows queue counts and recent task state/results.

The agent also has deferred tools `compute_submit_task` and `compute_task_status` to submit and inspect these same tasks as part of a development request.

## Connect a Windows worker

Requirements: Node.js 20+, Git, and a checkout of this repository. CMake and a C++17 compiler are additionally required for `cmake-test`.

From PowerShell in the repository root:

```powershell
$env:SOLO_COMPUTE_WORKER_TOKEN = "YOUR_SOLO_COMPUTE_WORKER_TOKEN"
node .\web-chat\compute-worker.mjs connect https://cssbc-github-chat.descapan.workers.dev worker-01
```

If the optional GitHub secret `CSSBC_SOLO_COMPUTE_WORKER_TOKEN` is configured, use that exact value. Otherwise the worker token falls back to the SOLO.Chat application password. Keep it in the local process environment only; never paste it into chat or commit it. The worker sends heartbeats, claims tasks, checks out the exact commit SHA, runs the fixed task steps, and submits bounded results.

The worker's checkout must be at the exact commit shown on the queued task. If it is not, the task is rejected rather than silently testing different code. The worker does not automatically change branches or pull code.

## Fixed task allowlist

- `node-smoke`: `npm install --ignore-scripts`, TypeScript check, and SOLO.Chat regression tests.
- `cmake-test`: CMake configure, build, and CTest.

No task can provide a command, shell script, executable path, arbitrary URL, or arbitrary arguments. The worker uses `spawnSync` with `shell:false`, bounded output, and a 600-second per-step timeout. Leases expire after 35 minutes; failed/expired tasks are retried up to three attempts.

## Trust and limitations

This is the first integrated volunteer-worker slice, not a hardened public compute marketplace. The allowlist limits task commands, but tests/build tools execute repository code. Only connect computers you trust and only process commits you trust. There is not yet OS-level sandboxing, per-device identity/revocation, signed task attestations, independent quorum validation, resource caps per volunteer, or a public opt-in node directory. Do not advertise anonymous public workers as safe or production-ready.

The Durable Object queue persists tasks and results in SOLO.Chat's existing storage. It is not unlimited: queue admission is bounded, worker machines supply their own electricity/CPU/RAM, and Cloudflare Worker/DO limits still apply. A worker is online only while its process is running and heartbeating.
