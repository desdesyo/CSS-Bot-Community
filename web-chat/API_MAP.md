# SOLO.Chat API and tool map

> Generated from current Worker and browser source. Run npm run api:map from web-chat/. CI checks this snapshot.

## Worker route matchers

### Exact paths
- `/api/agent/chat`
- `/api/agent/client-error`
- `/api/agent/computer/pair`
- `/api/agent/computer/pair-code`
- `/api/agent/computer/poll`
- `/api/agent/computer/result`
- `/api/agent/computer/status`
- `/api/agent/computer/task`
- `/api/agent/feedback`
- `/api/agent/feedback/ack`
- `/api/agent/github-check`
- `/api/agent/harness-check`
- `/api/agent/model-check`
- `/api/agent/status`
- `/api/agents/status`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/chat`
- `/api/chat/followup`
- `/api/chat/status`
- `/api/feedback`
- `/api/feedback/error`
- `/api/files`
- `/api/health`
- `/api/memory/status`
- `/api/messages`
- `/api/search-history`
- `/api/threads`
- `/api/ui/inspection`
- `/api/version`
- `/mcp`

### Prefix paths
- `/api/agent/…`
- `/api/files/…`

## Registered agent / MCP tools

- `analyze_source`
- `check_3d_model`
- `computer_install_smx`
- `computer_request`
- `computer_task_result`
- `computer_write_text_file`
- `consult_external_expert`
- `create_text_artifact`
- `generate_3d_model`
- `generate_image`
- `generate_music`
- `generate_speech`
- `github_list_files`
- `github_project_list_files`
- `github_project_read_file`
- `github_project_write_file`
- `github_read_file`
- `github_write_file`
- `handoff_to_chatgpt`
- `load_learned_skill`
- `mcp_call_readonly_tool`
- `mcp_connect`
- `mcp_list_tools`
- `save_learned_skill`
- `solo_capability_check`
- `solo_generate_image`
- `solo_github_write_check`
- `solo_harness_probe`
- `solo_ui_inspect`
- `solo_ui_write_file`
- `web_search`

## Browser API path references

- `/api/agent/client-error`
- `/api/agent/computer/pair-code`
- `/api/agents/status`
- `/api/auth/login`
- `/api/chat`
- `/api/chat/followup`
- `/api/feedback`
- `/api/feedback/error`
- `/api/files`
- `/api/files/`
- `/api/health`
- `/api/memory/status`
- `/api/search-history`
- `/api/threads`
- `/api/ui/inspection`
- `/api/version`

## Architecture boundary

- Browser requests are handled by the Worker; authenticated agent requests are delegated to the Durable Object / Pi harness.
- Registered Pi tools are discovered on demand; the complete catalog is not necessarily sent to the model on every turn.
- The MCP image bridge exposes its own protocol surface; it is not the same thing as the full agent tool registry.
- This inventory proves names are present in source, not that credentials, providers, deployment, or live calls work.
