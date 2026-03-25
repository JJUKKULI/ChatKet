// client/cli-client.js
"use strict";

const net = require("net");
const readline = require("readline");
const Protocol = require("../shared/protocol");
const { SERVER, MSG_TYPE } = require("../shared/constants");

// 터미널 입력 처리
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 서버 연결
const socket = net.connect({ host: SERVER.HOST, port: SERVER.PORT }, () => {
  console.log("✅ 서버에 연결되었습니다.\n");
  rl.prompt();
});

// ── 서버 → 클라이언트 메시지 수신 ─────────────────
let buffer = ""; // 서버와 동일하게 버퍼링 처리

socket.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const msg = Protocol.decode(trimmed);
    if (!msg) continue;

    // 메시지 타입별 출력 형식
    switch (msg.type) {
      case MSG_TYPE.CHAT:
        console.log(`\n💬 ${msg.from}: ${msg.body}`);
        break;
      case MSG_TYPE.SYSTEM:
        console.log(`\n📢 [시스템] ${msg.body}`);
        break;
      case MSG_TYPE.WHISPER:
        console.log(`\n🔒 [귓속말] ${msg.from} → ${msg.to}: ${msg.body}`);
        break;
      case MSG_TYPE.ERROR:
        console.log(`\n❌ [오류] ${msg.body}`);
        break;
      case MSG_TYPE.INFO:
        console.log(`\nℹ️  ${msg.body}`);
        break;
    }
    rl.prompt(); // 입력 프롬프트 다시 표시
  }
});

// ── 사용자 입력 → 서버 전송 ──────────────────────
rl.on("line", (input) => {
  const trimmed = input.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }
  // 그냥 문자열을 그대로 보냄 — 서버에서 파싱
  socket.write(trimmed + "\n");
  rl.prompt();
});

// ── 종료 처리 ────────────────────────────────────
socket.on("end", () => {
  console.log("\n서버 연결이 종료되었습니다.");
  process.exit(0);
});
socket.on("error", (err) => {
  console.error(`\n연결 오류: ${err.message}`);
  process.exit(1);
});
rl.on("close", () => {
  socket.write("/quit\n");
  socket.end();
});
