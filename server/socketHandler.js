// server/socketHandler.js
"use strict";

const clientStore = require("./clientStore");
const broadcast = require("./utils/broadcast");
const Protocol = require("../shared/protocol");
const logger = require("./utils/logger");
const { COMMANDS } = require("../shared/constants");

// ─────────────────────────────────────────────
// TCP 버퍼링 문제 해설
// ─────────────────────────────────────────────
// TCP는 "스트림" — 메시지 경계가 없음
// socket.write("hello\n") 해도 data 이벤트에서
// "hell"  / "o\n" 처럼 쪼개져 올 수 있고
// "hello\nworld\n" 처럼 두 개가 붙어올 수도 있음
//
// 해결책: 소켓마다 buffer 문자열을 유지하고
// \n(개행)이 나올 때만 메시지 처리
// ─────────────────────────────────────────────

function handleSocket(socket) {
  // 이 클라이언트 전용 버퍼 (소켓 하나당 하나씩)
  let buffer = "";

  // 1. 클라이언트 등록
  const client = clientStore.add(socket);
  logger.success(`접속: ${client.nickname} (${socket.remoteAddress})`);

  // 2. 입장 안내: 나한테만
  broadcast.toOne(
    socket,
    Protocol.system(`서버에 접속했습니다. 닉네임: ${client.nickname}\n` + `명령어 목록을 보려면 /help 를 입력하세요.`),
  );

  // 3. 다른 사람들에게 입장 알림
  broadcast.toAll(
    Protocol.system(`${client.nickname} 님이 입장했습니다. (현재 ${clientStore.count()}명)`),
    socket, // 나는 제외
  );

  // ── 데이터 수신 ──────────────────────────────
  socket.on("data", (chunk) => {
    // chunk를 버퍼에 누적
    buffer += chunk.toString();

    // \n 기준으로 완성된 메시지만 처리
    const lines = buffer.split("\n");

    // 마지막 요소는 아직 완성 안 된 조각 → 다시 버퍼에 보관
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue; // 빈 줄 무시

      processMessage(socket, trimmed);
    }
  });

  // ── 정상 종료 ────────────────────────────────
  socket.on("end", () => {
    handleDisconnect(socket, "연결 종료");
  });

  // ── 비정상 종료 (네트워크 끊김 등) ─────────────
  // end 이벤트와 별도로 처리해야 함 — 이걸 빠뜨리면 서버가 crash 날 수 있음
  socket.on("error", (err) => {
    // ECONNRESET = 상대방이 갑자기 끊음 (일반적인 상황)
    if (err.code !== "ECONNRESET") {
      logger.error(`소켓 에러 [${client?.nickname}]: ${err.message}`);
    }
    handleDisconnect(socket, "연결 오류");
  });
}

// ── 메시지 처리 ──────────────────────────────────
function processMessage(socket, raw) {
  const currentClient = clientStore.get(socket);
  if (!currentClient) return;

  // /로 시작하면 명령어, 아니면 일반 채팅
  if (raw.startsWith("/")) {
    handleCommand(socket, raw, currentClient);
  } else {
    // 일반 채팅 — 나를 제외한 전체에게 브로드캐스트
    logger.chat(currentClient.nickname, raw);
    broadcast.toAll(Protocol.chat(currentClient.nickname, raw), socket);
  }
}

// ── 명령어 처리 ──────────────────────────────────
function handleCommand(socket, raw, client) {
  // "  /w   Alice  hello  " → ["/w", "Alice", "hello"]
  const parts = raw.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case COMMANDS.NICK: {
      const newNick = parts[1];
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
      broadcast.toAll(Protocol.system(`"${oldNick}" 님이 닉네임을 "${newNick}" 으로 변경했습니다.`));
      logger.info(`닉네임 변경: ${oldNick} → ${newNick}`);
      break;
    }

    case COMMANDS.LIST: {
      const list = clientStore
        .getAll()
        .map((c) => (c.socket === socket ? `${c.nickname} (나)` : c.nickname))
        .join(", ");
      broadcast.toOne(socket, Protocol.info(`현재 접속자 (${clientStore.count()}명): ${list}`));
      break;
    }

    case COMMANDS.WHISPER: {
      // /w <닉네임> <메시지...>
      const targetNick = parts[1];
      const body = parts.slice(2).join(" ");

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
        broadcast.toOne(socket, Protocol.error(`"${targetNick}" 님을 찾을 수 없습니다.`));
        return;
      }

      broadcast.whisper(socket, target.socket, Protocol.whisper(client.nickname, targetNick, body));
      logger.info(`귓속말: ${client.nickname} → ${targetNick}`);
      break;
    }

    case COMMANDS.HELP: {
      const helpText = [
        "── 사용 가능한 명령어 ──────────────",
        "/nick <이름>         닉네임 변경",
        "/list                접속자 목록",
        "/w <닉네임> <메시지>  귓속말",
        "/help                이 도움말",
        "/quit                종료",
        "────────────────────────────────",
      ].join("\n");
      broadcast.toOne(socket, Protocol.info(helpText));
      break;
    }

    case COMMANDS.QUIT: {
      broadcast.toOne(socket, Protocol.system("안녕히 가세요!"));
      socket.end(); // 정상 종료 신호 → end 이벤트 발생
      break;
    }

    default: {
      broadcast.toOne(socket, Protocol.error(`"${cmd}" 는 알 수 없는 명령어입니다. /help 를 입력해보세요.`));
    }
  }
}

// ── 연결 해제 처리 ───────────────────────────────
function handleDisconnect(socket, reason) {
  const client = clientStore.remove(socket);
  if (!client) return; // 이미 처리됨 (end + error 중복 방지)

  logger.warn(`퇴장: ${client.nickname} (${reason})`);
  broadcast.toAll(Protocol.system(`${client.nickname} 님이 퇴장했습니다. (현재 ${clientStore.count()}명)`));
}

module.exports = handleSocket;
