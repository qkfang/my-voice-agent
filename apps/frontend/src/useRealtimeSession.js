import { useRef, useState, useCallback } from 'react';

// Tools exposed to the AI for GitHub operations (matched by name in the Python API).
const GITHUB_TOOLS = [
  {
    type: 'function',
    name: 'get_repo',
    description: 'Get details and status of a GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Repository owner (user or org)' },
        repo: { type: 'string', description: 'Repository name' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    type: 'function',
    name: 'list_issues',
    description: 'List open issues in a GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        repo: { type: 'string' },
      },
      required: ['owner', 'repo'],
    },
  },
  {
    type: 'function',
    name: 'search_repositories',
    description: 'Search GitHub repositories by query',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

export function useRealtimeSession() {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micRef = useRef(null); // { stream, worklet, source }

  const appendMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  // Update the last assistant message in-place (for streaming deltas).
  const appendDelta = useCallback((delta) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
      }
      return [...prev, { role: 'assistant', text: delta, id: Date.now() }];
    });
  }, []);

  // Decode base64 PCM16 audio and play it through the AudioContext.
  const playAudio = useCallback((base64) => {
    if (!audioCtxRef.current) return;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer);
    const floats = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) floats[i] = pcm[i] / 32768;
    const buf = audioCtxRef.current.createBuffer(1, floats.length, 24000);
    buf.getChannelData(0).set(floats);
    const src = audioCtxRef.current.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtxRef.current.destination);
    src.start();
  }, []);

  // Handle a completed function call from the AI: call the Python API and return the result.
  const handleFunctionCall = useCallback(async (callId, name, argsStr) => {
    let args = {};
    try { args = JSON.parse(argsStr); } catch (_) { /* ignore */ }

    let output = '';
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: name, args }),
      });
      const data = await res.json();
      output = data.result ?? JSON.stringify(data);
    } catch (err) {
      output = `Error: ${err.message}`;
    }

    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'function_call_output', call_id: callId, output },
      }));
      ws.send(JSON.stringify({ type: 'response.create' }));
    }
  }, []);

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'response.audio.delta':
        playAudio(event.delta);
        break;
      case 'response.text.delta':
        appendDelta(event.delta);
        break;
      case 'response.text.done':
        break;
      case 'response.function_call_arguments.done':
        handleFunctionCall(event.call_id, event.name, event.arguments);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        appendMessage('user', event.transcript?.trim() ?? '');
        break;
      case 'input_audio_buffer.speech_started':
        appendMessage('user', '…');
        break;
      case 'error':
        appendMessage('system', `Error: ${event.error?.message ?? 'unknown'}`);
        break;
      default:
        break;
    }
  }, [playAudio, appendDelta, appendMessage, handleFunctionCall]);

  const startMic = useCallback(async (ws) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await audioCtxRef.current.audioWorklet.addModule('/audioWorklet.js');
    const source = audioCtxRef.current.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(audioCtxRef.current, 'pcm-processor');

    worklet.port.onmessage = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const bytes = new Uint8Array(e.data);
      const binary = Array.from(bytes).reduce((s, b) => s + String.fromCharCode(b), '');
      ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(binary) }));
    };

    source.connect(worklet);
    micRef.current = { stream, worklet, source };
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting');
    audioCtxRef.current = new AudioContext({ sampleRate: 24000 });

    const ws = new WebSocket(`ws://${window.location.host}/api/realtime`);
    wsRef.current = ws;

    ws.onopen = async () => {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful GitHub assistant. Use tools to look up repository info and answer questions concisely.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad' },
          tools: GITHUB_TOOLS,
          tool_choice: 'auto',
        },
      }));
      await startMic(ws);
      setStatus('connected');
    };

    ws.onmessage = (e) => {
      try { handleEvent(JSON.parse(e.data)); } catch (_) { /* ignore */ }
    };
    ws.onclose = () => setStatus('idle');
    ws.onerror = () => setStatus('error');
  }, [handleEvent, startMic]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    micRef.current?.stream.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    wsRef.current = null;
    micRef.current = null;
    audioCtxRef.current = null;
    setStatus('idle');
  }, []);

  return { status, messages, connect, disconnect };
}
