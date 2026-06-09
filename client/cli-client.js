// client/cli-client.js
"use strict";

const net = require("net");
const readline = require("readline");
const Protocol = require("../shared/protocol");
const { SERVER, MSG_TYPE } = require("../shared/constants");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ← 이 플래그가 핵심 — 이미 종료 중이면 중복 처리 방지
let isQuitting = false;

const socket = net.connect({ host: SERVER.HOST, port: SERVER.PORT }, () => {
  console.log("✅ 서버에 연결되었습니다.\n");
  rl.prompt();
});

let buffer = "";

socket.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const msg = Protocol.decode(trimmed);
    if (!msg) continue;

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
    rl.prompt();
  }
});

socket.on("line", (input) => {
  const trimmed = input.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }
  socket.write(trimmed + "\n");
  rl.prompt();
});

rl.on("line", (input) => {
  const trimmed = input.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }
  socket.write(trimmed + "\n");
  rl.prompt();
});

// 서버가 정상 종료 신호를 보낸 경우 (내가 /quit 입력 → 서버가 socket.end())
socket.on("end", () => {
  if (isQuitting) return; // 이미 처리 중이면 무시
  isQuitting = true;
  console.log("\n서버 연결이 종료되었습니다.");
  rl.close();
  process.exit(0);
});

socket.on("error", (err) => {
  console.error(`\n연결 오류: ${err.message}`);
  process.exit(1);
});

// Ctrl+C 또는 /quit 입력 시
rl.on("close", () => {
  if (isQuitting) return; // 이미 처리 중이면 중복 전송 방지
  isQuitting = true;
  if (!socket.destroyed) {
    socket.write("/quit\n");
    socket.end();
  }
});
