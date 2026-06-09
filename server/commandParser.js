// server/commandParser.js
'use strict';

const clientStore      = require('./clientStore');
const broadcast        = require('./utils/broadcast');
const Protocol         = require('../shared/protocol');
const logger           = require('./utils/logger');
const { COMMANDS }     = require('../shared/constants');
const messageFormatter = require('./utils/messageFormatter');

const commandHandlers = new Map([
  [COMMANDS.NICK,    handleNick],
  [COMMANDS.LIST,    handleList],
  [COMMANDS.WHISPER, handleWhisper],
  [COMMANDS.HELP,    handleHelp],
  [COMMANDS.QUIT,    handleQuit],
]);

function parse(socket, raw) {
  const client = clientStore.get(socket);
  if (!client) return;

  const parts   = raw.trim().split(/\s+/);
  const cmd     = parts[0].toLowerCase();
  const args    = parts.slice(1);
  const handler = commandHandlers.get(cmd);

  if (!handler) {
    broadcast.toOne(socket, Protocol.error(
      `"${cmd}" 는 알 수 없는 명령어입니다. /help 를 입력해보세요.`
    ));
    return;
  }
  handler(socket, args, client);
}

function handleNick(socket, args, client) {
  const newNick = args[0];
  if (!newNick) {
    broadcast.toOne(socket, Protocol.error('사용법: /nick <닉네임>'));
    return;
  }
  const oldNick = client.nickname;
  const result  = clientStore.setNickname(socket, newNick);
  if (!result.ok) {
    broadcast.toOne(socket, Protocol.error(result.reason));
    return;
  }
  broadcast.toAll(Protocol.system(messageFormatter.nickChange(oldNick, newNick)));
  logger.info(`닉네임 변경: ${oldNick} → ${newNick}`);
}

function handleList(socket, args, client) {
  const all  = clientStore.getAll();
  const body = messageFormatter.userList(all, client.nickname);
  broadcast.toOne(socket, Protocol.info(body));
}

function handleWhisper(socket, args, client) {
  const targetNick = args[0];
  const body       = args.slice(1).join(' ');
  if (!targetNick || !body) {
    broadcast.toOne(socket, Protocol.error('사용법: /w <닉네임> <메시지>'));
    return;
  }
  if (targetNick === client.nickname) {
    broadcast.toOne(socket, Protocol.error('자신에게는 귓속말을 보낼 수 없습니다.'));
    return;
  }
  const target = clientStore.findByNickname(targetNick);
  if (!target) {
    broadcast.toOne(socket, Protocol.error(
      `"${targetNick}" 님을 찾을 수 없습니다. /list 로 확인해보세요.`
    ));
    return;
  }
  broadcast.whisper(socket, target.socket, Protocol.whisper(client.nickname, targetNick, body));
  logger.info(`귓속말: ${client.nickname} → ${targetNick}`);
}

function handleHelp(socket) {
  broadcast.toOne(socket, Protocol.info(messageFormatter.helpText()));
}

function handleQuit(socket, args, client) {
  // ── /quit 핵심 수정 ─────────────────────────────────────
  // 1. 퇴장하는 사람에게만 안내 메시지
  broadcast.toOne(socket, Protocol.system('안녕히 가세요! 👋'));

  // 2. 나머지 사람들에게 퇴장 알림 (닉네임 변경 알림과 동일한 방식)
  const count = clientStore.count() - 1; // 나가면 한 명 줄어듦
  broadcast.toAll(
    Protocol.system(messageFormatter.leave(client.nickname, count)),
    socket // 나는 제외
  );

  // 3. clientStore에서 즉시 제거 (더 이상 broadcast 대상이 되지 않음)
  clientStore.remove(socket);
  logger.warn(`퇴장 (/quit): ${client.nickname}`);

  // 4. 소켓 종료 — 메시지 전달 후 100ms 뒤 연결 끊기
  setTimeout(() => {
    if (!socket.destroyed) socket.end();
  }, 100);
}

module.exports = { parse };
