// server/wsHandler.js
"use strict";

const { WebSocketServer } = require("ws");
const clientStore = require("./clientStore");
const broadcast = require("./utils/broadcast");
const Protocol = require("../shared/protocol");
const logger = require("./utils/logger");
const messageFormatter = require("./utils/messageFormatter");
const { parse } = require("./commandParser");

/**
 * 어댑터 패턴: ws 객체에 TCP socket 인터페이스를 추가
 * → 기존 clientStore, broadcast 등을 수정 없이 재사용 가능
 */
function adaptSocket(ws, req) {
  ws.write = (data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  };
  ws.destroyed = false;
  ws.remoteAddress = req.socket.remoteAddress;
  ws.on("close", () => {
    ws.destroyed = true;
  });
  return ws;
}

function createWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws, req) => {
    const socket = adaptSocket(ws, req);
    let buffer = "";

    const client = clientStore.add(socket);
    logger.success(`[WS] 접속: ${client.nickname} (${socket.remoteAddress})`);

    broadcast.toOne(
      socket,
      Protocol.system(
        `서버에 접속했습니다. 닉네임: ${client.nickname}\n` + `명령어 목록을 보려면 /help 를 입력하세요.`,
      ),
    );

    broadcast.toAll(Protocol.system(messageFormatter.join(client.nickname, clientStore.count())), socket);

    ws.on("message", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("/")) {
          parse(socket, trimmed);
        } else {
          logger.chat(client.nickname, trimmed);
          broadcast.toAll(Protocol.chat(client.nickname, trimmed), socket);
        }
      }
    });

    ws.on("close", () => handleDisconnect(socket, "연결 종료"));
    ws.on("error", (err) => {
      logger.error(`[WS] 에러 [${client?.nickname}]: ${err.message}`);
      handleDisconnect(socket, "연결 오류");
    });
  });

  logger.success("[WS] WebSocket 서버 준비 완료");
  return wss;
}

function handleDisconnect(socket, reason) {
  const client = clientStore.remove(socket);
  if (!client) return;

  logger.warn(`[WS] 퇴장: ${client.nickname} (${reason})`);
  broadcast.toAll(Protocol.system(messageFormatter.leave(client.nickname, clientStore.count())));
}

module.exports = { createWsServer };
