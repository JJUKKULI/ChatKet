// client/web/src/hooks/useChat.js
import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = "ws://localhost:3002";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [whispers, setWhispers] = useState({});
  const [connected, setConnected] = useState(false);
  const [myNick, setMyNick] = useState("");
  const [users, setUsers] = useState([]);
  // 사이드바 전체채팅 프리뷰용 — 마지막 일반 메시지
  const [lastGroupMsg, setLastGroupMsg] = useState("");
  const wsRef = useRef(null);
  const myNickRef = useRef("");

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (e) => console.error("WS 에러:", e);

    ws.onmessage = ({ data }) => {
      data
        .split("\n")
        .filter(Boolean)
        .forEach((line) => {
          try {
            handleIncoming(JSON.parse(line));
          } catch {}
        });
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    myNickRef.current = myNick;
  }, [myNick]);

  function makeId() {
    return Date.now() + Math.random();
  }

  function handleIncoming(msg) {
    if (msg.type === "system") {
      // 초기 닉네임 추출
      const joinMatch = msg.body?.match(/닉네임: (\S+)/);
      if (joinMatch) setMyNick(joinMatch[1]);

      // 닉네임 변경
      const nickMatch = msg.body?.match(/"(.+)" 님이 닉네임을 "(.+)" 으로/);
      if (nickMatch) {
        setMyNick((prev) => (prev === nickMatch[1] ? nickMatch[2] : prev));
        // users 목록도 갱신
        setUsers((prev) => prev.map((u) => (u === nickMatch[1] ? nickMatch[2] : u)));
      }

      // 입장 → users에 추가
      const enterMatch = msg.body?.match(/^(.+) 님이 입장했습니다/);
      if (enterMatch) {
        const nick = enterMatch[1];
        setUsers((prev) => (prev.includes(nick) ? prev : [...prev, nick]));
      }

      // 퇴장 → users에서 제거 + DM 스레드 오프라인 표시
      const leaveMatch = msg.body?.match(/^(.+) 님이 퇴장했습니다/);
      if (leaveMatch) {
        const nick = leaveMatch[1];
        setUsers((prev) => prev.filter((u) => u !== nick));
        // DM 스레드는 유지 (메시지 기록 보존), 오프라인 상태만 반영
        setWhispers((prev) => {
          if (!prev[nick]) return prev;
          return {
            ...prev,
            [nick]: prev[nick], // 기록 유지, users에서 없어지면 오프라인으로 표시됨
          };
        });
      }

      setMessages((prev) => [...prev, { ...msg, id: makeId() }]);
      return;
    }

    if (msg.type === "info") {
      // /list 응답 파싱
      if (msg.body?.includes("현재 접속자")) {
        const lines = msg.body.split("\n").filter((l) => l.trim() && !l.startsWith("──") && !l.includes("접속자"));
        const parsed = lines.map((l) => l.replace(" (나)", "").trim()).filter(Boolean);
        setUsers(parsed);
        return; // 채팅창에는 표시 안 함
      }
      setMessages((prev) => [...prev, { ...msg, id: makeId() }]);
      return;
    }

    if (msg.type === "whisper") {
      if (msg.from === myNickRef.current) return; // 내가 보낸 건 이미 로컬에 추가됨
      const otherNick = msg.from;
      setWhispers((prev) => ({
        ...prev,
        [otherNick]: [...(prev[otherNick] || []), { ...msg, id: makeId() }],
      }));
      return;
    }

    // chat / error
    const newMsg = { ...msg, id: makeId() };
    setMessages((prev) => [...prev, newMsg]);

    // 전체채팅 사이드바 프리뷰 업데이트
    if (msg.type === "chat") {
      const preview = msg.from === myNickRef.current ? `나: ${msg.body}` : `${msg.from}: ${msg.body}`;
      setLastGroupMsg(preview);
    }
  }

  const send = useCallback((text) => {
    if (!text.trim() || !wsRef.current) return;
    if (!text.startsWith("/")) {
      // 내 메시지 로컬 추가 + 프리뷰 업데이트
      setMessages((prev) => [
        ...prev,
        {
          type: "chat",
          from: myNickRef.current,
          body: text,
          ts: Date.now(),
          id: Date.now() + Math.random(),
        },
      ]);
      setLastGroupMsg(`나: ${text}`);
    }
    wsRef.current.send(text + "\n");
  }, []);

  const sendWhisper = useCallback((toNick, text) => {
    if (!text.trim() || !wsRef.current) return;
    const msg = {
      type: "whisper",
      from: myNickRef.current,
      to: toNick,
      body: text,
      ts: Date.now(),
      id: Date.now() + Math.random(),
    };
    setWhispers((prev) => ({
      ...prev,
      [toNick]: [...(prev[toNick] || []), msg],
    }));
    wsRef.current.send(`/w ${toNick} ${text}\n`);
  }, []);

  const requestUserList = useCallback(() => {
    if (wsRef.current) wsRef.current.send("/list\n");
  }, []);

  return {
    messages,
    whispers,
    connected,
    myNick,
    users,
    lastGroupMsg,
    send,
    sendWhisper,
    requestUserList,
  };
}
