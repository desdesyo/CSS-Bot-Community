# SOLO Distributed Compute — first safe slice

This directory starts the distributed-compute foundation without pretending that a public, multi-user compute network already exists.

## What works in this slice

- A versioned task envelope with a fixed task-type allowlist.
- A local worker that reports its capabilities and executes only built-in checks.
- Commit pinning: a task can run only when the checkout's HEAD matches the requested commit.
- Bounded execution time and bounded captured output.
- JSON result records suitable for later upload/aggregation.
- A GitHub-hosted ephemeral runner workflow for the same deterministic checks.

## Run locally

Requirements: Node.js 20+, Git, CMake, and a C++17 compiler for the CMake task.

```sh
node solo-compute/worker.mjs doctor
node solo-compute/worker.mjs run solo-compute/tasks/smoke.json
```

The smoke task checks the bridge, Code Lab, worker, and coordinator Node tests. See [COORDINATOR.md](./COORDINATOR.md) for the local task-queue service. The cmake task configures, builds, and runs CTest.

## Safety boundary

The worker does **not** accept shell commands, executable paths, scripts, URLs, or arbitrary task payloads. It maps a small enum to hard-coded argument arrays and uses `spawnSync(..., {shell:false})`. It refuses a mismatched commit SHA. Logs are capped and each task has a hard timeout.

This is a trusted-repository worker, not a sandbox. It must only run code from a repository/commit the operator trusts. Do not expose it to anonymous task submitters or untrusted pull requests. Before multi-user volunteer nodes, add OS-level isolation (Windows Sandbox/Hyper-V or Linux namespaces/containers), signed task manifests, authenticated scheduling, result validation, quotas, and a kill/pause control.

## Free capacity reality

The local worker uses the volunteer computer's own CPU, memory, disk, and electricity. The GitHub workflow uses temporary hosted runners subject to GitHub's public-repository policies and availability. Neither creates unlimited physical compute. This first slice deliberately has no always-on server, paid cloud dependency, or background daemon.

## Next milestone

A coordinator that publishes signed, immutable task manifests and collects worker result files. Do not add arbitrary remote code execution as a shortcut.
