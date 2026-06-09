// client/web/src/hooks/useChat.js
import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:3002';

export function useChat() {
  const [messages,     setMessages]     = useState([]);
  const [whispers,     setWhispers]     = useState({});
  const [connected,    setConnected]    = useState(false);
  const [myNick,       setMyNick]       = useState('');
  const [users,        setUsers]        = useState([]);
  const [lastGroupMsg, setLastGroupMsg] = useState('');
  const wsRef     = useRef(null);
  const myNickRef = useRef('');

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen  = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.error('WS 에러:', e);
    ws.onmessage = ({ data }) => {
      data.split('\n').filter(Boolean).forEach((line) => {
        try { handleIncoming(JSON.parse(line)); } catch {}
      });
    };
    return () => ws.close();
  }, []);

  useEffect(() => { myNickRef.current = myNick; }, [myNick]);

  function makeId() { return Date.now() + Math.random(); }

  function handleIncoming(msg) {
    if (msg.type === 'system') {
      const joinMatch = msg.body?.match(/닉네임: (\S+)/);
      if (joinMatch) {
        const nick = joinMatch[1];
        setMyNick(nick);
        setUsers(prev => prev.includes(nick) ? prev : [...prev, nick]);
      }
      const nickMatch = msg.body?.match(/"(.+)" 님이 닉네임을 "(.+)" 으로/);
      if (nickMatch) {
        setMyNick(prev => prev === nickMatch[1] ? nickMatch[2] : prev);
        setUsers(prev => prev.map(u => u === nickMatch[1] ? nickMatch[2] : u));
      }
      const enterMatch = msg.body?.match(/^(.+) 님이 입장했습니다/);
      if (enterMatch) {
        const nick = enterMatch[1];
        setUsers(prev => prev.includes(nick) ? prev : [...prev, nick]);
      }
      const leaveMatch = msg.body?.match(/^(.+) 님이 퇴장했습니다/);
      if (leaveMatch) {
        setUsers(prev => prev.filter(u => u !== leaveMatch[1]));
      }
      setMessages(prev => [...prev, { ...msg, id: makeId() }]);
      return;
    }
    if (msg.type === 'info') {
      if (msg.body?.includes('현재 접속자')) {
        const lines = msg.body.split('\n').filter(l =>
          l.trim() && !l.startsWith('──') && !l.includes('접속자')
        );
        setUsers(lines.map(l => l.replace(' (나)', '').trim()).filter(Boolean));
        return;
      }
      setMessages(prev => [...prev, { ...msg, id: makeId() }]);
      return;
    }
    if (msg.type === 'whisper') {
      if (msg.from === myNickRef.current) return;
      const otherNick = msg.from;
      setWhispers(prev => ({
        ...prev,
        [otherNick]: [...(prev[otherNick] || []), { ...msg, id: makeId() }],
      }));
      return;
    }
    const newMsg = { ...msg, id: makeId() };
    setMessages(prev => [...prev, newMsg]);
    if (msg.type === 'chat') {
      setLastGroupMsg(
        msg.from === myNickRef.current ? `나: ${msg.body}` : `${msg.from}: ${msg.body}`
      );
    }
  }

  const send = useCallback((text) => {
    if (!text.trim() || !wsRef.current) return;
    if (!text.startsWith('/')) {
      setMessages(prev => [...prev, {
        type:'chat', from:myNickRef.current, body:text,
        ts:Date.now(), id:Date.now()+Math.random()
      }]);
      setLastGroupMsg(`나: ${text}`);
    }
    wsRef.current.send(text + '\n');
  }, []);

  const sendWhisper = useCallback((toNick, text) => {
    if (!text.trim() || !wsRef.current) return;
    const msg = { type:'whisper', from:myNickRef.current, to:toNick, body:text, ts:Date.now(), id:Date.now()+Math.random() };
    setWhispers(prev => ({ ...prev, [toNick]: [...(prev[toNick] || []), msg] }));
    wsRef.current.send(`/w ${toNick} ${text}\n`);
  }, []);

  const requestUserList = useCallback(() => {
    if (wsRef.current) wsRef.current.send('/list\n');
  }, []);

  return { messages, whispers, connected, myNick, users, lastGroupMsg, send, sendWhisper, requestUserList };
}
