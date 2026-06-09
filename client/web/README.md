# 💬 Chatket — TCP Socket Chat Application

> Node.js TCP 소켓 기반 실시간 채팅 시스템  
> WebSocket + React Instagram DM 스타일 UI  
> Network Computing 개인 프로젝트

---

## 📌 프로젝트 개요

Node.js의 `net` 모듈을 이용한 **TCP 소켓 통신** 기반 채팅 서버와,
WebSocket을 통해 연결되는 **React 웹 UI**를 함께 구현한 채팅 시스템입니다.

**핵심 구현 포인트:**
- TCP 스트림의 메시지 프레이밍 문제 해결 (개행 기반 버퍼링)
- 어댑터 패턴으로 TCP / WebSocket 동시 지원
- 단일 책임 원칙에 따른 모듈 분리 설계
- Instagram DM 스타일 다크모드 React UI + DM 스레드

---

## 🏗️ 시스템 아키텍처

```
[CLI Client] ──TCP:3000──┐
                         ├──[socketHandler] ──[commandParser]
[React UI] ──WS:3002──[wsHandler]    │             │
(WebSocket)              │       [broadcast]  [clientStore]
                         └──[messageFormatter][protocol][logger]
```

### 계층별 역할

| 계층 | 파일 | 역할 |
|------|------|------|
| **Transport** | server.js, socketHandler.js, wsHandler.js | 소켓 연결/해제 처리 |
| **Logic** | commandParser.js, broadcast.js, messageFormatter.js | 명령어 파싱, 메시지 라우팅, 포맷 |
| **State** | clientStore.js | 접속자 상태 중앙 관리 |
| **Shared** | protocol.js, constants.js, logger.js | 공통 프로토콜, 상수, 로깅 |

---

## ⚙️ 핵심 기술 설명

### 1. TCP 메시지 프레이밍 (버퍼링 처리)

TCP는 바이트 스트림 프로토콜로, 메시지 경계가 보장되지 않습니다.

```
# 문제: 하나의 write가 여러 data 이벤트로 분리될 수 있음
송신: "Hello\n" + "World\n"
수신: "Hell" → "o\nWor" → "ld\n"  (단편화 발생)
```

**해결:** 개행 문자(`\n`)를 메시지 구분자로 사용하고,
소켓별 `buffer` 변수에 수신 데이터를 누적 후 `\n` 기준으로 파싱합니다.

```javascript
socket.on('data', (chunk) => {
  buffer += chunk.toString();        // ① 누적
  const lines = buffer.split('\n'); // ② \n 기준 분리
  buffer = lines.pop();             // ③ 미완성 조각 재보관
  lines.forEach(line => processMessage(socket, line.trim()));
});
```

### 2. JSON 메시지 프로토콜

서버-클라이언트 간 모든 메시지는 구조화된 JSON으로 교환합니다.

```json
{ "type": "chat",    "from": "Alice", "body": "안녕하세요", "ts": 1712345678 }
{ "type": "system",  "from": "System","body": "Alice 님이 입장했습니다", "ts": 1712345679 }
{ "type": "whisper", "from": "Alice", "to": "Bob", "body": "귓속말", "ts": 1712345680 }
{ "type": "error",   "from": "Server","body": "닉네임 중복", "ts": 1712345681 }
```

→ 동일한 프로토콜을 TCP CLI와 WebSocket React UI가 함께 사용합니다.

### 3. 어댑터 패턴 — TCP/WebSocket 동시 지원

TCP `socket`과 WebSocket `ws`는 API가 다릅니다.

```javascript
// TCP:       socket.write(data),  socket.destroyed
// WebSocket: ws.send(data),       ws.readyState === OPEN
```

`wsHandler.js`에서 ws 객체에 `.write()` 메서드를 동적으로 추가하여
**기존 모듈(clientStore, broadcast, commandParser)을 한 줄도 수정하지 않고 재사용**합니다.

```javascript
// wsHandler.js — 어댑터 적용
ws.write = (data) => {
  if (ws.readyState === ws.OPEN) ws.send(data);
};
// → 이제 ws는 TCP socket처럼 동작
```

### 4. 에러 처리 케이스

| 에러 | 처리 방법 |
|------|-----------|
| `ECONNRESET` | 클라이언트 강제 종료 → error 이벤트 감지 후 퇴장 처리 |
| `EADDRINUSE` | 포트 충돌 → 명확한 메시지 출력 후 `process.exit(1)` |
| 닉네임 중복 | Set으로 O(1) 검사 → 에러 메시지 송신자에게만 전송 |
| 존재하지 않는 유저 귓속말 | `findByNickname()` null 반환 → `/list` 확인 유도 |
| 알 수 없는 명령어 | commandHandlers Map miss → `/help` 안내 |
| 빈 메시지 | `trim()` 후 필터링 → 조용히 무시 |

---

## 🚀 실행 방법

### 사전 요구사항
- Node.js 18 이상

### 설치

```bash
git clone https://github.com/아이디/Chatket.git
cd Chatket
npm install
npm run install:web   # React 패키지 설치
```

### 실행

```bash
# 터미널 1 — 서버 (TCP:3000 + WebSocket:3002)
npm run dev

# 터미널 2 — CLI 클라이언트 (TCP)
npm run client:cli

# 터미널 3 — React 웹 UI
npm run client:web
# → 브라우저에서 http://localhost:3000 접속
```

---

## 💬 지원 명령어

| 명령어 | 설명 |
|--------|------|
| `/nick <이름>` | 닉네임 설정/변경 |
| `/list` | 현재 접속자 목록 |
| `/w <닉네임> <메시지>` | 귓속말 (Web UI에서는 + 버튼으로도 가능) |
| `/help` | 명령어 도움말 |
| `/quit` | 연결 종료 |

---

## 🎨 Web UI 특징

- **Instagram DM 스타일** 다크모드 인터페이스
- **사이드바:** 전체 채팅 + 귓속말 DM 스레드 목록
- **+ 버튼:** 접속 중인 유저 선택 → 바로 DM 전송
- **말풍선:** 내 메시지(파란) / 상대(회색) + 시간 표시
- **실시간:** WebSocket으로 메시지 즉시 반영

---

## 📁 프로젝트 구조

```
Chatket/
├── server/
│   ├── server.js               # TCP + WebSocket 서버 부트스트랩
│   ├── socketHandler.js        # TCP 소켓 이벤트 처리 (버퍼링 포함)
│   ├── wsHandler.js            # WebSocket 어댑터 (Adapter Pattern)
│   ├── clientStore.js          # 접속자 상태 관리 (Map 기반)
│   ├── commandParser.js        # 명령어 파싱 및 디스패치
│   └── utils/
│       ├── broadcast.js        # 메시지 전송 라우팅
│       ├── logger.js           # 컬러 타임스탬프 로깅
│       └── messageFormatter.js # 메시지 텍스트 포맷
├── client/
│   ├── cli-client.js           # TCP CLI 클라이언트
│   └── web/src/
│       ├── App.jsx             # 메인 채팅 UI
│       ├── App.css             # Instagram DM 다크모드 스타일
│       └── hooks/useChat.js    # WebSocket 상태 관리 훅
└── shared/
    ├── constants.js            # 포트, 닉네임 규칙 등 상수
    └── protocol.js             # JSON 메시지 인코딩/디코딩
```

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| Runtime | Node.js v22 |
| TCP Transport | net 모듈 (내장) |
| WebSocket | ws 라이브러리 |
| Frontend | React, CSS |
| Dev Tool | nodemon |
| Protocol | JSON over newline-delimited stream |
