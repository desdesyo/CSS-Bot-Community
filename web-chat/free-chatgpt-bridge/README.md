# SOLO.Chat ↔ Free ChatGPT browser bridge

This adapter lets SOLO.Chat ask the signed-in **ChatGPT Free web UI** for help when its own knowledge base has no relevant answer and configured model providers are unavailable. It does not use the OpenAI API and does not bypass ChatGPT Free usage limits.

## Components

1. SOLO.Chat queues a request in its Durable Object.
2. This local Node.js service claims the request over HTTPS and exposes it only on `127.0.0.1`.
3. The Chrome/Edge extension reads the task, submits it to the currently open ChatGPT tab, waits for the completed assistant response, and returns it to this local service.
4. The service posts the answer to SOLO.Chat. SOLO.Chat saves it as a sourced knowledge entry for later retrieval.

## Setup

1. Install Node.js 20 or newer.
2. Run `SETUP.cmd`. Enter your SOLO.Chat app password when prompted; the input is hidden. The script creates the ignored local `config.json` and prints a random local bridge token.
3. Run `START-BRIDGE.cmd` and leave its console window open.
4. In Chrome or Edge, open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the `extension` folder.
5. Open ChatGPT in a dedicated tab, sign in to the Free account, click the extension icon, paste the token printed by setup, and save it.
6. Keep the ChatGPT tab and local Node process open.

## Important limits

- The extension reads the ChatGPT web page. UI changes can require selector updates.
- The browser must be signed in and the tab must remain open and online.
- ChatGPT Free may impose its own rate limits, CAPTCHA, login prompts, or temporary unavailability. The bridge reports failures; it cannot bypass those limits.
- Requests and answers pass through the local machine and the ChatGPT web interface. Do not send passwords, API keys, private files, or other secrets in prompts.
- External answers are stored with provenance `free-chatgpt-bridge`; they are not represented as independently fact-checked.
- The extension does not submit arbitrary page content. It only handles tasks explicitly queued by the authenticated SOLO.Chat service.
