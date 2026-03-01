# my-voice-agent

Voice assistant powered by **Azure OpenAI Realtime** (gpt-4o-realtime-preview) that answers questions about GitHub repositories.

## Structure

| Path | Description |
|---|---|
| `apps/frontend` | React + Vite voice UI |
| `apps/api` | Python FastAPI backend (WebSocket proxy + GitHub MCP) |
| `bicep` | Azure Bicep templates (Azure OpenAI + model deployment) |

## Quick start

1. **Deploy infrastructure** – see [`bicep/README.md`](bicep/README.md).
2. **Start API** – see [`apps/api/README.md`](apps/api/README.md).
3. **Start frontend** – see [`apps/frontend/README.md`](apps/frontend/README.md).
