# CSSBC tests — agent instructions

Read repository-root \`AGENTS.md\` before changing tests.

- Keep portable-core tests independent of Source SDK headers and the game installation.
- Test externally observable behavior, boundaries, failure paths and regression cases; avoid tests that merely mirror implementation expressions.
- For random/probabilistic logic, inject deterministic seeds or assert valid invariants/ranges rather than exact random outcomes.
- For engine adapters, use explicit fakes and label them as adapter contract tests. They do not prove the engine calls the adapter.
- ABI tests must cover null interface, wrong ABI, undersized struct, missing function pointers, invalid names/teams/skill and stale generation handles.
- Every new bug fix gets a regression test that fails before the fix.
- Run CMake configure/build/ctest for portable core; run Windows Win32 SDK build separately for native code.
- Never mark tests as runtime/gameplay validation unless they actually launch the exact v34 server and exercise the feature.
