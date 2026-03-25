// server/utils/messageFormatter.js
"use strict";

const messageFormatter = {
  // 입장 메시지
  join(nickname, count) {
    return `${nickname} 님이 입장했습니다 🟢  (현재 ${count}명)`;
  },

  // 퇴장 메시지
  leave(nickname, count) {
    return `${nickname} 님이 퇴장했습니다 🔴  (현재 ${count}명)`;
  },

  // 닉네임 변경 메시지
  nickChange(oldNick, newNick) {
    return `"${oldNick}" 님이 닉네임을 "${newNick}" 으로 변경했습니다.`;
  },

  // /list 응답 메시지
  userList(clients, myNickname) {
    const names = clients.map((c) => (c.nickname === myNickname ? `${c.nickname} (나)` : c.nickname));

    return [
      `── 현재 접속자 (${clients.length}명) ─────────`,
      names.join("\n"),
      "─────────────────────────────────",
    ].join("\n");
  },

  // /help 응답 메시지
  helpText() {
    return [
      "── 사용 가능한 명령어 ──────────────",
      "/nick <이름>          닉네임 변경",
      "/list                 접속자 목록",
      "/w <닉네임> <메시지>   귓속말",
      "/help                 이 도움말",
      "/quit                 종료",
      "────────────────────────────────",
    ].join("\n");
  },

  // 서버 시작 배너
  banner(host, port, maxClients) {
    return [
      "╔══════════════════════════════════╗",
      "║       Chatket Server v1.0        ║",
      "╚══════════════════════════════════╝",
      `  Host    : ${host}`,
      `  Port    : ${port}`,
      `  Max     : ${maxClients}명`,
      "──────────────────────────────────",
    ].join("\n");
  },
};

module.exports = messageFormatter;
