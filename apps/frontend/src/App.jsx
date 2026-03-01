import { useRealtimeSession } from './useRealtimeSession';
import './App.css';

export default function App() {
  const { status, messages, connect, disconnect } = useRealtimeSession();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Voice Agent</h1>
        <p>GitHub Repository Assistant</p>
      </header>

      <main className="app-main">
        <div className="controls">
          {status === 'idle' || status === 'error' ? (
            <button className="btn btn-start" onClick={connect}>
              🎤 Start
            </button>
          ) : (
            <button className="btn btn-stop" onClick={disconnect}>
              ⏹ Stop
            </button>
          )}
          <span className={`status status-${status}`}>{status}</span>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <p className="hint">Press Start and ask about a GitHub repository.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`message message-${m.role}`}>
              <span className="message-role">{m.role}</span>
              <span className="message-text">{m.text}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
