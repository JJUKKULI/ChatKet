// server/utils/logger.js
// 로그를 시간과 함께 예쁘게 출력해주는 유틸리티
// → console.log 대신 이걸 써야 나중에 파일 저장 등으로 확장 가능

"use strict";

// ANSI 컬러 코드 (터미널 색상)
const COLOR = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
};

function timestamp() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

const logger = {
  // 서버 정보 (파란색)
  info(msg) {
    console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.blue}ℹ ${msg}${COLOR.reset}`);
  },

  // 성공/접속 (초록색)
  success(msg) {
    console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.green}✓ ${msg}${COLOR.reset}`);
  },

  // 경고 (노란색)
  warn(msg) {
    console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.yellow}⚠ ${msg}${COLOR.reset}`);
  },

  // 에러 (빨간색)
  error(msg) {
    console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.red}✖ ${msg}${COLOR.reset}`);
  },

  // 채팅 메시지 (청록색)
  chat(from, msg) {
    console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.cyan}💬 ${from}:${COLOR.reset} ${msg}`);
  },
};

module.exports = logger;
