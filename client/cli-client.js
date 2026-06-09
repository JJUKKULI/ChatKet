// client/cli-client.js
'use strict';

const net      = require('net');
const readline = require('readline');
const Protocol  = require('../shared/protocol');
const { SERVER, MSG_TYPE } = require('../shared/constants');

const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout,
});

// 이중 종료 방지 플래그
let isQuitting = false;

const socket = net.connect({ host: SERVER.HOST, port: SERVER.PORT }, () => {
  console.log('✅ 서버에 연결되었습니다.\n');
  rl.prompt();
});

let buffer = '';

socket.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
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

rl.on('line', (input) => {
  const trimmed = input.trim();
  if (!trimmed) { rl.prompt(); return; }
  socket.write(trimmed + '\n');
  rl.prompt();
});

// 서버가 socket.end()를 보낸 경우 (내 /quit에 대한 응답)
socket.on('end', () => {
  if (isQuitting) return;
  isQuitting = true;
  console.log('\n연결이 종료되었습니다.');
  rl.close();
  process.exit(0);
});

socket.on('error', (err) => {
  if (isQuitting) return;
  isQuitting = true;
  console.error(`\n연결 오류: ${err.message}`);
  process.exit(1);
});

// Ctrl+C 또는 입력 스트림 종료 시
rl.on('close', () => {
  if (isQuitting) return; // 이미 처리 중이면 무시
  isQuitting = true;
  if (!socket.destroyed) {
    socket.write('/quit\n');
    setTimeout(() => process.exit(0), 200);
  }
});
