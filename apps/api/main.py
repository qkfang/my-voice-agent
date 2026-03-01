import os
import asyncio
import json

import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from github_handler import call_github_tool

load_dotenv()

app = FastAPI(title="Voice Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
AZURE_OPENAI_API_KEY = os.environ["AZURE_OPENAI_API_KEY"]
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-realtime-preview")
REALTIME_API_VERSION = os.getenv("REALTIME_API_VERSION", "2024-10-01-preview")


class ToolRequest(BaseModel):
    tool: str
    args: dict = {}


@app.post("/api/github")
async def github_tool(req: ToolRequest):
    result = await call_github_tool(req.tool, req.args)
    return {"result": result}


@app.websocket("/api/realtime")
async def realtime_proxy(client: WebSocket):
    await client.accept()

    base = AZURE_OPENAI_ENDPOINT.rstrip("/").replace("https://", "wss://")
    azure_url = (
        f"{base}/openai/realtime"
        f"?api-version={REALTIME_API_VERSION}"
        f"&deployment={AZURE_OPENAI_DEPLOYMENT}"
    )
    headers = {"api-key": AZURE_OPENAI_API_KEY}

    try:
        async with websockets.connect(azure_url, additional_headers=headers) as azure:
            async def to_azure():
                try:
                    async for msg in client.iter_text():
                        await azure.send(msg)
                except WebSocketDisconnect:
                    await azure.close()

            async def to_client():
                try:
                    async for msg in azure:
                        await client.send_text(msg)
                except Exception:
                    pass

            await asyncio.gather(to_azure(), to_client())
    except Exception as exc:
        await client.send_text(json.dumps({"type": "error", "error": {"message": str(exc)}}))
        await client.close()
