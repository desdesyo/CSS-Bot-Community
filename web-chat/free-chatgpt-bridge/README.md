# SOLO.Chat Free ChatGPT Bridge

This optional bridge lets SOLO.Chat submit unanswered questions to the user's already signed-in ChatGPT browser session. It is not an API connection and it does not grant ChatGPT direct access to SOLO.Chat or the user's files.

## Setup

1. On the Windows PC, install Node.js 20 or newer.
2. Copy `config.example.json` to `config.json` and set the SOLO.Chat URL, the same SOLO.Chat password used to sign in, and a random local bridge token of at least 24 characters.
3. Run `SETUP.cmd`. Enter the SOLO.Chat password into the hidden PowerShell prompt; setup generates a random local token and writes `config.json` (ignored by Git). Then run `START-BRIDGE.cmd`.
4. In Chrome or Edge, open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose Load unpacked, and select the `extension` folder.
5. Open a dedicated ChatGPT tab, sign in to the Free account, open the extension popup, paste the same local bridge token, and enable the bridge. Keep this tab open.
6. The bridge sends a heartbeat to SOLO.Chat. The bridge is a last-resort provider: SOLO.Chat checks its approved knowledge first, then tries its configured tool-capable and independent text-only model providers. Only if those paths fail (or the internal daily request quota is exhausted) is an unanswered user request relayed through the signed-in ChatGPT tab. A healthy SOLO.Chat model is never bypassed just because the browser bridge is online.

## Knowledge review and trust

- Responses received through this bridge are stored as external, unverified knowledge.
- They are **not** returned as authoritative direct database answers until the user explicitly approves them.
- They may be included in model context only with an explicit unverified-source warning.
- Authenticated review endpoints:
  - `GET /api/knowledge/review` — list pending external answers.
  - `POST /api/knowledge/review` with `{"id":"<entry-uuid>","decision":"approve"}` or `{"id":"<entry-uuid>","decision":"reject"}` — review one entry.
- Requests use the existing SOLO.Chat authenticated session/password. Do not expose the password or local bridge token.

## Limits

- The browser bridge is best-effort: ChatGPT Free message limits, login challenges, UI changes, sleeping tabs, or a closed browser can prevent a reply.
- The extension reports the bridge as online only when the ChatGPT tab has a usable composer and does not appear to be on a login or verification screen.
- If a delivered task is interrupted by a tab reload or browser restart, the local relay makes it available for redelivery after the response timeout; it does not mark a request complete without a returned answer.
- It uses the active ChatGPT tab. Use a dedicated tab so automated prompts do not mix with personal conversations.
- Keep the local server bound to `127.0.0.1`; do not expose port 8765 to the network.
- This bridge does not fine-tune model weights. It builds a searchable knowledge store; approval changes whether an external answer can be reused directly. Provider circuit breakers also pause exhausted or failing API providers for a bounded cooldown instead of repeatedly burning quota on the same failing endpoint.
