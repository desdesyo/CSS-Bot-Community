# SOLO Compute Coordinator

The coordinator is a small, dependency-free Node.js service for a trusted private network. It provides a persistent task queue, worker heartbeats, task leases, bounded retries, result validation, and a status endpoint.

## Quick start on Windows

1. Extract the repository branch ZIP.
2. Double-click `Start-SOLO-Compute-Coordinator.bat` and enter a private token of at least 32 characters.
3. In a second terminal on the same computer, double-click `Start-SOLO-Compute-Worker.bat` and enter the exact same token.
4. To queue a task, send an authenticated POST to `/v1/tasks` with a supported task type and the exact 40-character commit SHA checked out by the worker.

The launchers keep the token in the process environment only; they do not write it into the repository.

## Start on the coordinator computer

Node.js 20+ is required. Set a long random token (at least 32 random characters) and start:

```powershell
$env:SOLO_COMPUTE_TOKEN = "replace-with-a-long-random-secret"
node .\solo-compute\coordinator.mjs
```

The service binds to `127.0.0.1` by default and stores state in `build/solo-compute-coordinator/state.json`. Set `SOLO_COMPUTE_PORT` or `SOLO_COMPUTE_DATA` to change these. It intentionally binds only to loopback in this first version; do not expose it to the public internet.

## API

All `/v1/*` endpoints require `Authorization: Bearer <token>`.

- `GET /health` — unauthenticated health probe.
- `GET /v1/status` — queue and active worker counts.
- `POST /v1/tasks` — enqueue an allowlisted task. JSON: `{"task_type":"node-smoke","commit_sha":"<40-char-sha>","timeout_seconds":300}`.
- `POST /v1/workers/heartbeat` — register/update worker. JSON: `{"worker_id":"node-01","platform":"win32","cpu_count":4}`.
- `POST /v1/tasks/claim` — claim next queued task. JSON: `{"worker_id":"node-01"}`.
- `POST /v1/tasks/<task_id>/result` — submit validated result envelope with `worker_id` and `result`.

Leases expire after thirty-five minutes; failed/expired tasks are retried at most three times. Task types are a hard-coded allowlist. The coordinator does not accept shell commands, scripts, executable paths, or arbitrary URLs.

## Connect a worker

On a second checkout of the exact same commit as the queued task, set the same private token and run:

```powershell
$env:SOLO_COMPUTE_TOKEN = "the-same-long-private-token"
node .\\solo-compute\\worker.mjs connect https://your-private-coordinator.example node-01
```

For same-computer testing, use `http://127.0.0.1:8787`. The worker sends a heartbeat, claims one task at a time, runs only its built-in allowlisted command set, and submits the result. It refuses non-HTTPS remote coordinator URLs and refuses tasks whose pinned commit does not match the local checkout.

## Current security and deployment boundary

This is a functional coordinator prototype, not a production public scheduler. It stores one JSON state file, binds to loopback, uses a shared bearer token, and does not yet provide TLS, per-node identities, signed manifests, or OS sandboxing. It is suitable only for local development/trusted single-user testing. For remote volunteer nodes, deploy behind authenticated TLS and implement per-node credentials, revocation, signed task manifests, resource limits, OS-level isolation, and independent result validation first.
