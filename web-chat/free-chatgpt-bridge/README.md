# SOLO.Chat Free ChatGPT Bridge

This optional bridge lets SOLO.Chat submit unanswered questions to the user's already signed-in ChatGPT browser session. It is not an API connection and it does not grant ChatGPT direct access to SOLO.Chat or the user's files.

## Setup

1. On the Windows PC, install Node.js 20 or newer.
2. Copy `config.example.json` to `config.json` and set the SOLO.Chat URL, the same SOLO.Chat password used to sign in, and a random local bridge token of at least 24 characters.
3. Run `SETUP.cmd`, then `START-BRIDGE.cmd`.
4. In Chrome or Edge, open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose Load unpacked, and select the `extension` folder.
5. Open a dedicated ChatGPT tab, sign in to the Free account, open the extension popup, paste the same local bridge token, and enable the bridge. Keep this tab open.
6. The bridge sends a heartbeat to SOLO.Chat. When SOLO.Chat has no sufficiently relevant approved knowledge answer, the request can be relayed through the signed-in ChatGPT tab.

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
- It uses the active ChatGPT tab. Use a dedicated tab so automated prompts do not mix with personal conversations.
- Keep the local server bound to `127.0.0.1`; do not expose port 8765 to the network.
- This bridge does not fine-tune model weights. It builds a searchable knowledge store; approval changes whether an external answer can be reused directly.
