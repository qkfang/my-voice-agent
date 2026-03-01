# Frontend

React voice UI that streams audio to the Azure OpenAI Realtime API via the backend WebSocket proxy.

## Setup

```bash
npm install
cp ../api/.env.example ../api/.env   # configure API keys in the API service
npm run dev
```

Open http://localhost:5173 and press **Start** to begin a voice session.

## How it works

1. Connects to `/api/realtime` (proxied by Vite in dev, served by FastAPI in prod).
2. Streams PCM16 microphone audio to Azure OpenAI Realtime.
3. When the model invokes a GitHub tool, the frontend POSTs to `/api/github` and returns the result.
4. The model responds with synthesised voice audio.
