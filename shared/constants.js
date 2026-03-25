// shared/constants.js
// 프로젝트 전체에서 쓰는 고정값들을 한 곳에 모아둠
// → 포트 번호를 바꾸고 싶을 때 이 파일 하나만 수정하면 됨

"use strict";

const CONSTANTS = {
  // 서버 설정
  SERVER: {
    HOST: "localhost",
    PORT: 3000,
    MAX_CLIENTS: 50,
  },

  // 메시지 타입 (서버-클라이언트가 주고받는 메시지 종류)
  MSG_TYPE: {
    CHAT: "chat", // 일반 채팅
    SYSTEM: "system", // 서버 공지 (입장/퇴장 등)
    WHISPER: "whisper", // 귓속말
    ERROR: "error", // 에러 알림
    INFO: "info", // 사용자 정보 응답
  },

  // 커맨드 (사용자가 /로 시작하는 명령어)
  COMMANDS: {
    NICK: "/nick", // 닉네임 변경
    WHISPER: "/w", // 귓속말
    LIST: "/list", // 접속자 목록
    HELP: "/help", // 도움말
    QUIT: "/quit", // 종료
  },

  // 닉네임 규칙
  NICKNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    DEFAULT_PREFIX: "Guest", // 닉네임 미설정시 Guest1, Guest2...
  },
};

module.exports = CONSTANTS;
