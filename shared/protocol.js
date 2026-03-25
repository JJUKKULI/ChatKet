// shared/protocol.js
// 서버와 클라이언트가 주고받는 메시지 형식(프로토콜)을 정의
// → 나중에 WebSocket/React로 바꿔도 이 형식은 그대로 유지됨

"use strict";

const { MSG_TYPE } = require("./constants");

const Protocol = {
  /**
   * 메시지 객체를 만드는 함수들
   * 모든 메시지는 이 함수들을 통해 생성 → 형식이 항상 일관됨
   */

  // 일반 채팅 메시지
  chat(from, body) {
    return { type: MSG_TYPE.CHAT, from, body, ts: Date.now() };
  },

  // 시스템 메시지 (입장, 퇴장, 공지)
  system(body) {
    return { type: MSG_TYPE.SYSTEM, from: "System", body, ts: Date.now() };
  },

  // 귓속말
  whisper(from, to, body) {
    return { type: MSG_TYPE.WHISPER, from, to, body, ts: Date.now() };
  },

  // 에러 메시지
  error(body) {
    return { type: MSG_TYPE.ERROR, from: "Server", body, ts: Date.now() };
  },

  // 정보 메시지 (예: /list 응답)
  info(body) {
    return { type: MSG_TYPE.INFO, from: "Server", body, ts: Date.now() };
  },

  /**
   * 전송/수신 직렬화
   * TCP는 텍스트 스트림이라 JSON을 문자열로 변환해야 함
   * \n (개행)을 구분자로 사용 → 메시지 경계를 명확히 함
   */
  encode(msgObject) {
    return JSON.stringify(msgObject) + "\n";
  },

  decode(rawString) {
    try {
      return JSON.parse(rawString.trim());
    } catch {
      return null; // 파싱 실패 시 null 반환 (에러 처리는 호출자에서)
    }
  },
};

module.exports = Protocol;
