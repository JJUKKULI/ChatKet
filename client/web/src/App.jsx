// client/web/src/App.jsx
import { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import './App.css';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false });
}

export default function App() {
  const { messages, whispers, connected, myNick, users, lastGroupMsg, send, sendWhisper, requestUserList } = useChat();
  const [input, setInput] = useState('');
  const [activeChat, setActiveChat] = useState('main');
  const [showUserModal, setShowUserModal] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, whispers, activeChat]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    activeChat === 'main' ? send(input) : sendWhisper(activeChat, input);
    setInput('');
  }

  function handlePlusClick() { requestUserList(); setShowUserModal(true); }
  function handleUserSelect(nick) { setActiveChat(nick); setShowUserModal(false); }

  const currentMessages = activeChat === 'main' ? messages : (whispers[activeChat] || []);
  const dmList = Object.keys(whispers);

  return (
    <div className="ig-layout">
      <aside className="ig-sidebar">
        <div className="ig-sidebar-header">
          <span className="ig-my-nick">{myNick || '연결 중...'}</span>
          <button className="ig-plus-btn" onClick={handlePlusClick} title="새 메시지">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </button>
        </div>
        <div className="ig-sidebar-label">메시지</div>

        {/* 전체 채팅 — lastGroupMsg 프리뷰 */}
        <div className={`ig-room ${activeChat === 'main' ? 'active' : ''}`} onClick={() => setActiveChat('main')}>
          <div className="ig-room-avatar group">💬</div>
          <div className="ig-room-info">
            <span className="ig-room-name">전체 채팅</span>
            <span className="ig-room-preview truncate">
              {lastGroupMsg || (connected ? '● 활성' : '○ 오프라인')}
            </span>
          </div>
        </div>

        {/* DM 스레드 — 온라인 여부 표시 */}
        {dmList.map(nick => {
          const lastMsg  = whispers[nick]?.slice(-1)[0];
          const isOnline = users.includes(nick);
          return (
            <div key={nick} className={`ig-room ${activeChat === nick ? 'active' : ''}`} onClick={() => setActiveChat(nick)}>
              <div className="ig-room-avatar dm">{nick[0]?.toUpperCase()}</div>
              <div className="ig-room-info">
                <span className="ig-room-name">
                  {nick}
                  <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',marginLeft:6,verticalAlign:'middle',background:isOnline?'#23A55A':'#606060'}}/>
                </span>
                <span className="ig-room-preview truncate">
                  {lastMsg ? `${lastMsg.from === myNick ? '나: ' : ''}${lastMsg.body}` : (isOnline ? '대화를 시작해보세요' : '오프라인')}
                </span>
              </div>
            </div>
          );
        })}
      </aside>

      <main className="ig-chat">
        <header className="ig-chat-header">
          <div className={`ig-header-avatar ${activeChat !== 'main' ? 'dm' : 'group'}`}>
            {activeChat === 'main' ? '💬' : activeChat[0]?.toUpperCase()}
          </div>
          <div className="ig-header-info">
            <span className="ig-header-name">{activeChat === 'main' ? '전체 채팅' : activeChat}</span>
            <span className={`ig-header-status ${connected ? 'on' : 'off'}`}>
              {activeChat === 'main' ? (connected ? '활성' : '오프라인') : '개인 메시지'}
            </span>
          </div>
        </header>

        <div className="ig-messages">
          {currentMessages.length === 0 && (
            <div className="ig-empty">
              <div className="ig-empty-icon">{activeChat === 'main' ? '💬' : '🔒'}</div>
              <p>{activeChat === 'main' ? '아직 메시지가 없습니다' : `${activeChat}님과의 대화`}</p>
              <p>첫 메시지를 보내보세요!</p>
            </div>
          )}
          {currentMessages.map(msg => <MessageItem key={msg.id} msg={msg} myNick={myNick} />)}
          <div ref={bottomRef} />
        </div>

        <form className="ig-input-area" onSubmit={handleSubmit}>
          <div className="ig-input-wrap">
            <input className="ig-input" value={input} onChange={e => setInput(e.target.value)}
              placeholder={activeChat === 'main' ? '메시지 보내기...' : `${activeChat}에게 메시지...`}
              disabled={!connected} autoFocus />
            {input.trim() && <button className="ig-send-btn" type="submit">전송</button>}
          </div>
        </form>
      </main>

      {showUserModal && (
        <div className="ig-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="ig-modal" onClick={e => e.stopPropagation()}>
            <div className="ig-modal-header">
              <span>새 메시지</span>
              <button className="ig-modal-close" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <div className="ig-modal-label">접속 중인 사용자</div>
            <div className="ig-modal-users">
              {users.filter(u => u !== myNick).length === 0 ? (
                <div className="ig-modal-empty">다른 접속자가 없습니다</div>
              ) : (
                users.filter(u => u !== myNick).map(nick => (
                  <div key={nick} className="ig-modal-user" onClick={() => handleUserSelect(nick)}>
                    <div className="ig-modal-avatar">{nick[0]?.toUpperCase()}</div>
                    <span className="ig-modal-nick">{nick}</span>
                    <span className="ig-modal-arrow">→</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageItem({ msg, myNick }) {
  const isMe = msg.from === myNick;
  const time = msg.ts ? formatTime(msg.ts) : '';
  if (msg.type === 'system') return <div className="ig-msg-system">{msg.body}</div>;
  if (msg.type === 'error')  return <div className="ig-msg-error">⚠️ {msg.body}</div>;
  if (msg.type === 'info')   return <div className="ig-msg-info"><pre>{msg.body}</pre></div>;
  if (msg.type === 'chat' || msg.type === 'whisper') {
    return (
      <div className={`ig-msg-row ${isMe ? 'me' : 'other'}`}>
        {!isMe && <div className="ig-avatar">{msg.from?.[0]?.toUpperCase() || '?'}</div>}
        <div className="ig-msg-col">
          {!isMe && <span className="ig-nick">{msg.from}</span>}
          <div className={`ig-bubble ${isMe ? 'mine' : 'theirs'}`}>{msg.body}</div>
          <span className={`ig-time ${isMe ? 'me' : 'other'}`}>{time}</span>
        </div>
      </div>
    );
  }
  return null;
}
