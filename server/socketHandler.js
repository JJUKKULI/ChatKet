// server/socketHandler.js
"use strict";

const clientStore = require("./clientStore");
const broadcast = require("./utils/broadcast");
const Protocol = require("../shared/protocol");
const logger = require("./utils/logger");
const messageFormatter = require("./utils/messageFormatter");
const { parse } = require("./commandParser"); // ← 핵심 변경점

function handleSocket(socket) {
  let buffer = "";

  // 1. 클라이언트 등록
  const client = clientStore.add(socket);
  logger.success(`접속: ${client.nickname} (${socket.remoteAddress})`);

  // 2. 입장 안내 — 나한테만
  broadcast.toOne(
    socket,
    Protocol.system(`서버에 접속했습니다. 닉네임: ${client.nickname}\n` + `명령어 목록을 보려면 /help 를 입력하세요.`),
  );

  // 3. 다른 사람들에게 입장 알림
  broadcast.toAll(Protocol.system(messageFormatter.join(client.nickname, clientStore.count())), socket);

  // ── 데이터 수신 ──────────────────────────────
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // 미완성 조각은 다시 버퍼에

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      processMessage(socket, trimmed);
    }
  });

  socket.on("end", () => handleDisconnect(socket, "정상 종료"));
  socket.on("error", (err) => {
    if (err.code !== "ECONNRESET") {
      logger.error(`소켓 에러 [${clientStore.get(socket)?.nickname}]: ${err.message}`);
    }
    handleDisconnect(socket, "연결 오류");
  });
}

function processMessage(socket, raw) {
  const client = clientStore.get(socket);
  if (!client) return;

  if (raw.startsWith("/")) {
    parse(socket, raw); // commandParser에 위임 — 단 한 줄!
  } else {
    logger.chat(client.nickname, raw);
    broadcast.toAll(Protocol.chat(client.nickname, raw), socket);
  }
}

function handleDisconnect(socket, reason) {
  const client = clientStore.remove(socket);
  if (!client) return; // 중복 호출 방지

  logger.warn(`퇴장: ${client.nickname} (${reason})`);
  broadcast.toAll(Protocol.system(messageFormatter.leave(client.nickname, clientStore.count())));
}

module.exports = handleSocket;
