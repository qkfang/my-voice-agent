# API

Python FastAPI backend that:

- Proxies the Azure OpenAI Realtime WebSocket (`/api/realtime`) so the API key stays server-side.
- Handles GitHub tool calls (`POST /api/github`) by invoking the GitHub MCP server.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn main:app --reload --port 8000
```

## Environment variables

| Variable | Description |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name (default: `gpt-4o-realtime-preview`) |
| `GITHUB_TOKEN` | GitHub Personal Access Token (repo read scope) |
