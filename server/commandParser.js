// server/commandParser.js
"use strict";

const clientStore = require("./clientStore");
const broadcast = require("./utils/broadcast");
const Protocol = require("../shared/protocol");
const logger = require("./utils/logger");
const { COMMANDS } = require("../shared/constants");
const messageFormatter = require("./utils/messageFormatter");

// 명령어 핸들러 맵
// switch문 대신 Map을 쓰는 이유 →
// 나중에 명령어 추가할 때 이 맵에만 항목 추가하면 됨
// 기존 코드를 건드릴 필요가 없음 (Open/Closed Principle)
const commandHandlers = new Map([
  [COMMANDS.NICK, handleNick],
  [COMMANDS.LIST, handleList],
  [COMMANDS.WHISPER, handleWhisper],
  [COMMANDS.HELP, handleHelp],
  [COMMANDS.QUIT, handleQuit],
]);

/**
 * 메인 진입점 — socketHandler에서 이것만 호출
 * @param {net.Socket} socket
 * @param {string}     raw      사용자가 입력한 원문 문자열
 */
function parse(socket, raw) {
  const client = clientStore.get(socket);
  if (!client) return;

  // 첫 토큰이 명령어, 나머지가 인자
  const parts = raw.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1); // 인자 배열

  const handler = commandHandlers.get(cmd);

  if (!handler) {
    // 등록되지 않은 명령어
    broadcast.toOne(socket, Protocol.error(`"${cmd}" 는 알 수 없는 명령어입니다. /help 를 입력해보세요.`));
    return;
  }

  // 해당 명령어 핸들러 실행
  handler(socket, args, client);
}

// ─────────────────────────────────────────────────
// 개별 명령어 핸들러
// 모두 (socket, args, client) 시그니처를 통일함
// → 나중에 핸들러 추가할 때 같은 형태로만 만들면 됨
// ─────────────────────────────────────────────────

function handleNick(socket, args, client) {
  const newNick = args[0];

  if (!newNick) {
    broadcast.toOne(socket, Protocol.error("사용법: /nick <닉네임>"));
    return;
  }

  const oldNick = client.nickname;
  const result = clientStore.setNickname(socket, newNick);

  if (!result.ok) {
    broadcast.toOne(socket, Protocol.error(result.reason));
    return;
  }

  // 성공 → 전체에게 변경 알림
  broadcast.toAll(Protocol.system(messageFormatter.nickChange(oldNick, newNick)));
  logger.info(`닉네임 변경: ${oldNick} → ${newNick}`);
}

function handleList(socket, args, client) {
  const all = clientStore.getAll();
  const body = messageFormatter.userList(all, client.nickname);
  broadcast.toOne(socket, Protocol.info(body));
}

function handleWhisper(socket, args, client) {
  const targetNick = args[0];
  const body = args.slice(1).join(" "); // 나머지 전부 메시지로

  // 인자 검증
  if (!targetNick || !body) {
    broadcast.toOne(socket, Protocol.error("사용법: /w <닉네임> <메시지>"));
    return;
  }
  if (targetNick === client.nickname) {
    broadcast.toOne(socket, Protocol.error("자신에게는 귓속말을 보낼 수 없습니다."));
    return;
  }

  const target = clientStore.findByNickname(targetNick);
  if (!target) {
    broadcast.toOne(socket, Protocol.error(`"${targetNick}" 님을 찾을 수 없습니다. /list 로 접속자를 확인해보세요.`));
    return;
  }

  broadcast.whisper(socket, target.socket, Protocol.whisper(client.nickname, targetNick, body));
  logger.info(`귓속말: ${client.nickname} → ${targetNick}`);
}

function handleHelp(socket, args, client) {
  broadcast.toOne(socket, Protocol.info(messageFormatter.helpText()));
}

function handleQuit(socket, args, client) {
  broadcast.toOne(socket, Protocol.system("안녕히 가세요! 👋"));
  // 약간의 딜레이 후 종료 — 메시지가 전달될 시간을 줌
  setTimeout(() => socket.end(), 100);
}

module.exports = { parse };
