// server/socketHandler.js
'use strict';

/**
 * @file socketHandler.js
 * @description TCP 소켓의 생명주기를 관리한다.
 *
 * [TCP 버퍼링 문제]
 * TCP는 바이트 스트림 — 메시지 경계가 없음.
 * socket.write("hello\n") 해도 data 이벤트에서 쪼개져 올 수 있음.
 * → \n 구분자 + 소켓별 buffer 변수로 해결.
 *
 * [이벤트 설계]
 * close 이벤트를 사용 — end와 error 이후 반드시 발생하므로
 * handleDisconnect 를 단 한 번만 호출하도록 보장.
 */

const clientStore      = require('./clientStore');
const broadcast        = require('./utils/broadcast');
const Protocol         = require('../shared/protocol');
const logger           = require('./utils/logger');
const messageFormatter = require('./utils/messageFormatter');
const { parse }        = require('./commandParser');

function handleSocket(socket) {
  let buffer = '';

  const client = clientStore.add(socket);
  logger.success(`접속: ${client.nickname} (${socket.remoteAddress})`);

  broadcast.toOne(socket, Protocol.system(
    `서버에 접속했습니다. 닉네임: ${client.nickname}\n` +
    `명령어 목록을 보려면 /help 를 입력하세요.`
  ));

  broadcast.toAll(
    Protocol.system(messageFormatter.join(client.nickname, clientStore.count())),
    socket
  );

  // ── data: TCP 버퍼링 처리 ─────────────────────────────
  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 미완성 조각 재보관

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      processMessage(socket, trimmed);
    }
  });

  // ── close: end / error 모두 이 이벤트로 수렴 ─────────
  // /quit 의 경우 commandParser가 clientStore.remove()를 먼저 호출하므로
  // handleDisconnect 내부의 null 체크로 중복 처리가 자동 방지됨
  socket.on('close', () => {
    handleDisconnect(socket, '연결 종료');
  });

  // ── error: ECONNRESET 등 비정상 종료 로깅 ────────────
  // close 이벤트가 뒤따르므로 여기서는 로깅만 담당
  socket.on('error', (err) => {
    if (err.code !== 'ECONNRESET') {
      logger.error(`소켓 에러 [${clientStore.get(socket)?.nickname}]: ${err.message}`);
    }
  });
}

function processMessage(socket, raw) {
  const client = clientStore.get(socket);
  if (!client) return;

  if (raw.startsWith('/')) {
    parse(socket, raw);
  } else {
    logger.chat(client.nickname, raw);
    broadcast.toAll(Protocol.chat(client.nickname, raw), socket);
  }
}

/**
 * 연결 해제 공통 처리
 * /quit 시에는 commandParser가 clientStore.remove()를 먼저 했으므로
 * client가 null → 중복 broadcast 없음
 */
function handleDisconnect(socket, reason) {
  const client = clientStore.remove(socket);
  if (!client) return; // 이미 제거됨 (/quit 등) → 아무것도 안 함

  logger.warn(`퇴장: ${client.nickname} (${reason})`);
  broadcast.toAll(
    Protocol.system(messageFormatter.leave(client.nickname, clientStore.count()))
  );
}

module.exports = handleSocket;
