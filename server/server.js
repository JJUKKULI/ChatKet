// server/server.js
"use strict";

const net = require("net");
const handleSocket = require("./socketHandler");
const logger = require("./utils/logger");
const { SERVER } = require("../shared/constants");

// TCP 서버 생성
// net.createServer에 콜백을 넘기면 새 소켓마다 자동 호출됨
const server = net.createServer((socket) => {
  handleSocket(socket);
});

// 최대 접속자 제한
server.maxConnections = SERVER.MAX_CLIENTS;

// 서버 시작
server.listen(SERVER.PORT, SERVER.HOST, () => {
  logger.success(`Chatket 서버 시작 — ${SERVER.HOST}:${SERVER.PORT}`);
  logger.info(`최대 접속자: ${SERVER.MAX_CLIENTS}명`);
  logger.info("접속 대기 중...\n");
});

// 서버 레벨 에러 (포트 충돌 등)
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`포트 ${SERVER.PORT} 가 이미 사용 중입니다.`);
    logger.info("다른 터미널에서 실행 중인 서버가 있는지 확인하세요.");
  } else {
    logger.error(`서버 에러: ${err.message}`);
  }
  process.exit(1);
});

// Ctrl+C 종료 처리 (graceful shutdown)
process.on("SIGINT", () => {
  logger.warn("\n서버를 종료합니다...");
  server.close(() => {
    logger.info("모든 연결이 종료되었습니다.");
    process.exit(0);
  });
});
