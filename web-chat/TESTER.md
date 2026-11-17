# Chat Tester

A deterministic Chat Tester runs on every web-chat change in GitHub Actions. It checks Worker authentication/routes, GitHub-backed persistence, login/session recovery, composer focus, and Durable Agent runtime.

Any failed assertion exits non-zero and marks CI red. This is regression/static testing, not a live authenticated Cloudflare test: it cannot validate production secrets or credentials.
