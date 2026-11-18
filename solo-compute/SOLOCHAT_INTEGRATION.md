# Mounting SOLO Compute inside SOLO.Chat

## Repository boundary

This repository contains the CSS mod workshop and compute service, not the SOLO.Chat web application. There is no frontend/backend entrypoint here to patch. The adapter in this folder is therefore a real server-side integration module and explicit mounting contract, not a claim that the web UI has already been connected.

## Backend setup

Use Node.js 20+ and import `createSoloChatComputeHandler` from `solo-compute/solochat-adapter.mjs` in the SOLO.Chat server. Configure these secrets on the server process only:

- `SOLO_COMPUTE_URL=http://127.0.0.1:8787` for a coordinator on the same host.
- `SOLO_COMPUTE_TOKEN` set to the same private random token used by the coordinator.

Never expose `SOLO_COMPUTE_TOKEN` to browser JavaScript, HTML, local storage, or API responses.

Example framework-neutral Node HTTP mount:

```js
import { createSoloChatComputeHandler } from './solo-compute/solochat-adapter.mjs';

const computeHandler = createSoloChatComputeHandler({
  // Replace with the application's existing session validation.
  authorize: async (request) => getSessionUser(request) || null
});

server.on('request', async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/solo/compute')) {
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await readRequestBody(req)
    });
    const response = await computeHandler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  // Existing application routing continues here.
});
```

The example intentionally leaves `getSessionUser` and `readRequestBody` to the host app: the adapter must reuse SOLO.Chat's real session system rather than inventing a parallel login.

## Browser API

After mounting, the authenticated SOLO.Chat frontend can call:

- `GET /api/solo/compute/status`
- `POST /api/solo/compute/tasks` with `{"task_type":"node-smoke","commit_sha":"<40-char-sha>"}`
- `GET /api/solo/compute/tasks/<task-uuid>`

The adapter enforces session authorization, a 4 KiB body limit, allowlisted task types, full commit SHA pinning, and HTTPS for remote coordinators. It does not forward arbitrary command strings. Coordinator credentials remain server-side.

## Current limits

This adapter is not mounted in a running SOLO.Chat server because that application source is not present in this repository or available in the connected GitHub repositories. The host app must mount it and supply its actual session authorization callback. The coordinator remains a trusted-network prototype, not a public volunteer compute service.
