// server/server.js
'use strict';

const net                = require('net');
const http               = require('http');
const { createWsServer } = require('./wsHandler');
const handleSocket       = require('./socketHandler');
const logger             = require('./utils/logger');
const messageFormatter   = require('./utils/messageFormatter');
const { SERVER }         = require('../shared/constants');

// ── TCP 서버 (CLI 클라이언트용) ──────────────────────
const tcpServer = net.createServer((socket) => {
  handleSocket(socket);
});
tcpServer.maxConnections = SERVER.MAX_CLIENTS;
tcpServer.listen(SERVER.PORT, SERVER.HOST, () => {
  console.log(messageFormatter.banner(SERVER.HOST, SERVER.PORT, SERVER.MAX_CLIENTS));
  logger.info(`TCP       → ${SERVER.HOST}:${SERVER.PORT}`);
});

// ── HTTP + WebSocket 서버 (React UI용) ───────────────
const httpServer = http.createServer();
createWsServer(httpServer);
httpServer.listen(SERVER.WS_PORT, SERVER.HOST, () => {
  logger.info(`WebSocket → ${SERVER.HOST}:${SERVER.WS_PORT}`);
  logger.info('접속 대기 중...\n');
});

// ── 에러 처리 ─────────────────────────────────────────
tcpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') logger.error(`TCP 포트 ${SERVER.PORT} 가 이미 사용 중입니다.`);
  else logger.error(`TCP 서버 에러: ${err.message}`);
  process.exit(1);
});
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') logger.error(`WS 포트 ${SERVER.WS_PORT} 가 이미 사용 중입니다.`);
  else logger.error(`WS 서버 에러: ${err.message}`);
  process.exit(1);
});

// ── Graceful Shutdown ─────────────────────────────────
process.on('SIGINT', () => {
  logger.warn('\n서버를 종료합니다...');
  tcpServer.close();
  httpServer.close(() => {
    logger.info('종료 완료');
    process.exit(0);
  });
});
