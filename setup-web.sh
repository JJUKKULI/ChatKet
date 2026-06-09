#!/bin/bash
# =====================================================
# Chatket Web UI 자동 설치 스크립트
# 사용법: ChatKet 루트 폴더에서 bash setup-web.sh
# =====================================================

echo "🚀 Chatket Web UI 설치 시작..."

# client/web이 없으면 create-react-app 실행
if [ ! -f "client/web/package.json" ]; then
  echo "📦 React 앱 생성 중... (2~3분 소요)"
  cd client/web
  npx create-react-app . --silent
  cd ../..
  echo "✅ React 앱 생성 완료"
else
  echo "✅ React 앱 이미 존재 — 파일만 업데이트합니다"
fi

# 불필요한 기본 파일 제거
echo "🧹 기본 파일 정리 중..."
rm -f client/web/src/App.test.js
rm -f client/web/src/logo.svg
rm -f client/web/src/reportWebVitals.js
rm -f client/web/src/setupTests.js

# hooks 폴더 생성
mkdir -p client/web/src/hooks

# ─────────────────────────────────────────────
# index.js
# ─────────────────────────────────────────────
cat > client/web/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
EOF

# ─────────────────────────────────────────────
# index.css
# ─────────────────────────────────────────────
cat > client/web/src/index.css << 'EOF'
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #000;
  color: #fff;
  height: 100vh;
  overflow: hidden;
}
EOF

# ─────────────────────────────────────────────
# hooks/useChat.js
# ─────────────────────────────────────────────
cat > client/web/src/hooks/useChat.js << 'EOF'
// client/web/src/hooks/useChat.js
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:3001';

export function useChat() {
  const [messages,  setMessages]  = useState([]);
  const [connected, setConnected] = useState(false);
  const [myNick,    setMyNick]    = useState('');
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen  = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.error('WS 에러:', e);

    ws.onmessage = ({ data }) => {
      data.split('\n').filter(Boolean).forEach((line) => {
        try {
          const msg = JSON.parse(line);
          handleIncoming(msg);
        } catch {}
      });
    };

    return () => ws.close();
  }, []);

  function handleIncoming(msg) {
    // 내 초기 닉네임 추출
    if (msg.type === 'system') {
      const joinMatch = msg.body?.match(/닉네임: (\S+)/);
      if (joinMatch) setMyNick(joinMatch[1]);

      // 닉네임 변경 감지
      const nickMatch = msg.body?.match(/"(.+)" 님이 닉네임을 "(.+)" 으로/);
      if (nickMatch) {
        setMyNick(prev => prev === nickMatch[1] ? nickMatch[2] : prev);
      }
    }

    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }]);
  }

  const send = useCallback((text) => {
    if (!text.trim() || !wsRef.current) return;
    wsRef.current.send(text + '\n');
  }, []);

  return { messages, connected, myNick, send };
}
EOF

# ─────────────────────────────────────────────
# App.jsx
# ─────────────────────────────────────────────
cat > client/web/src/App.jsx << 'EOF'
// client/web/src/App.jsx
import { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import './App.css';

export default function App() {
  const { messages, connected, myNick, send } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput('');
  }

  return (
    <div className="ig-layout">

      {/* ── 왼쪽 사이드바 ── */}
      <aside className="ig-sidebar">
        <div className="ig-sidebar-header">
          <span className="ig-my-nick">{myNick || '연결 중...'}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.8">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
        </div>

        <div className="ig-sidebar-label">메시지</div>

        <div className="ig-room active">
          <div className="ig-room-avatar">💬</div>
          <div className="ig-room-info">
            <span className="ig-room-name">전체 채팅</span>
            <span className={`ig-room-preview ${connected ? 'on' : 'off'}`}>
              {connected ? '● 활성' : '○ 오프라인'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── 오른쪽 채팅 영역 ── */}
      <main className="ig-chat">

        {/* 상단 헤더 */}
        <header className="ig-chat-header">
          <div className="ig-header-avatar">💬</div>
          <div className="ig-header-info">
            <span className="ig-header-name">전체 채팅</span>
            <span className={`ig-header-status ${connected ? 'on' : 'off'}`}>
              {connected ? '활성' : '오프라인'}
            </span>
          </div>
        </header>

        {/* 메시지 목록 */}
        <div className="ig-messages">
          {messages.length === 0 && (
            <div className="ig-empty">
              <div className="ig-empty-icon">💬</div>
              <p>아직 메시지가 없습니다</p>
              <p>첫 메시지를 보내보세요!</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} myNick={myNick} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <form className="ig-input-area" onSubmit={handleSubmit}>
          <div className="ig-input-wrap">
            <input
              className="ig-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="메시지 보내기..."
              disabled={!connected}
              autoFocus
            />
            {input.trim() && (
              <button className="ig-send-btn" type="submit">전송</button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

// ── 메시지 타입별 렌더링 ──────────────────────────
function MessageItem({ msg, myNick }) {
  const isMe = msg.from === myNick;

  if (msg.type === 'system') {
    return <div className="ig-msg-system">{msg.body}</div>;
  }

  if (msg.type === 'error') {
    return <div className="ig-msg-error">⚠️ {msg.body}</div>;
  }

  if (msg.type === 'info') {
    return (
      <div className="ig-msg-info">
        <pre>{msg.body}</pre>
      </div>
    );
  }

  if (msg.type === 'whisper') {
    return (
      <div className={`ig-msg-row ${isMe ? 'me' : 'other'}`}>
        <div className="ig-bubble whisper">
          🔒 {isMe ? `→ ${msg.to}` : `${msg.from} →`} {msg.body}
        </div>
      </div>
    );
  }

  // 일반 채팅
  return (
    <div className={`ig-msg-row ${isMe ? 'me' : 'other'}`}>
      {!isMe && (
        <div className="ig-avatar">
          {msg.from?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      <div className="ig-msg-col">
        {!isMe && <span className="ig-nick">{msg.from}</span>}
        <div className={`ig-bubble ${isMe ? 'mine' : 'theirs'}`}>
          {msg.body}
        </div>
      </div>
    </div>
  );
}
EOF

# ─────────────────────────────────────────────
# App.css
# ─────────────────────────────────────────────
cat > client/web/src/App.css << 'EOF'
/* ── 레이아웃 ───────────────────────────── */
.ig-layout {
  display: flex;
  height: 100vh;
  background: #000;
  border: 1px solid #262626;
  max-width: 960px;
  margin: 0 auto;
}

/* ── 사이드바 ───────────────────────────── */
.ig-sidebar {
  width: 360px;
  border-right: 1px solid #262626;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.ig-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  color: #fff;
}

.ig-my-nick {
  font-size: 16px;
  font-weight: 700;
}

.ig-sidebar-label {
  font-size: 16px;
  font-weight: 700;
  padding: 8px 24px 16px;
  color: #fff;
}

.ig-room {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  cursor: pointer;
  border-radius: 8px;
  margin: 0 8px;
  transition: background 0.15s;
}
.ig-room:hover  { background: #1a1a1a; }
.ig-room.active { background: #1a1a1a; }

.ig-room-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.ig-room-name    { display: block; font-size: 14px; font-weight: 600; color: #fff; }
.ig-room-preview { display: block; font-size: 13px; margin-top: 2px; }
.ig-room-preview.on  { color: #4ade80; }
.ig-room-preview.off { color: #a8a8a8; }

/* ── 채팅 영역 ──────────────────────────── */
.ig-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ig-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #262626;
}

.ig-header-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.ig-header-name   { display: block; font-size: 14px; font-weight: 600; color: #fff; }
.ig-header-status { display: block; font-size: 12px; }
.ig-header-status.on  { color: #4ade80; }
.ig-header-status.off { color: #a8a8a8; }

/* ── 메시지 목록 ────────────────────────── */
.ig-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
  scrollbar-color: #262626 transparent;
}

.ig-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #a8a8a8;
  text-align: center;
}
.ig-empty-icon { font-size: 48px; margin-bottom: 8px; }
.ig-empty p:first-of-type { font-size: 16px; font-weight: 600; color: #fff; }

/* 메시지 행 */
.ig-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin: 2px 0;
}
.ig-msg-row.me    { flex-direction: row-reverse; }
.ig-msg-row.other { flex-direction: row; }

.ig-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.ig-msg-col { display: flex; flex-direction: column; max-width: 280px; }
.ig-nick    { font-size: 12px; color: #a8a8a8; margin-bottom: 4px; padding-left: 4px; }

/* 말풍선 */
.ig-bubble {
  padding: 10px 16px;
  border-radius: 22px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  max-width: 100%;
}
.ig-bubble.mine {
  background: #3797f0;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.ig-bubble.theirs {
  background: #262626;
  color: #fff;
  border-bottom-left-radius: 4px;
}
.ig-bubble.whisper {
  background: #2d1b4e;
  color: #c084fc;
  border-radius: 12px;
  font-style: italic;
  font-size: 13px;
}

/* 시스템 / 에러 / 정보 메시지 */
.ig-msg-system {
  text-align: center;
  font-size: 12px;
  color: #a8a8a8;
  padding: 8px 16px;
  margin: 4px 0;
}

.ig-msg-error {
  text-align: center;
  font-size: 13px;
  color: #f87171;
  background: #2d1515;
  border-radius: 10px;
  padding: 8px 16px;
  margin: 4px auto;
}

.ig-msg-info {
  background: #1a1a2e;
  border: 1px solid #3797f0;
  border-radius: 12px;
  padding: 12px 16px;
  margin: 4px 0;
}
.ig-msg-info pre {
  font-size: 13px;
  color: #a8a8a8;
  white-space: pre-wrap;
  font-family: inherit;
}

/* ── 입력창 ─────────────────────────────── */
.ig-input-area {
  padding: 16px 24px;
  border-top: 1px solid #262626;
}

.ig-input-wrap {
  display: flex;
  align-items: center;
  background: #000;
  border: 1px solid #363636;
  border-radius: 22px;
  padding: 10px 18px;
  gap: 10px;
  transition: border-color 0.2s;
}
.ig-input-wrap:focus-within { border-color: #a8a8a8; }

.ig-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 15px;
}
.ig-input::placeholder { color: #a8a8a8; }
.ig-input:disabled { opacity: 0.4; }

.ig-send-btn {
  background: none;
  border: none;
  color: #3797f0;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.ig-send-btn:hover { opacity: 0.7; }
EOF

echo ""
echo "✅ 모든 파일 생성 완료!"
echo ""
echo "📋 다음 단계:"
echo "  1. npm run dev          (터미널 1 — 서버)"
echo "  2. npm run client:web   (터미널 2 — React UI)"
echo "  3. 브라우저에서 http://localhost:3000 접속"
