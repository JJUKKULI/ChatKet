// server/utils/broadcast.js
"use strict";

const Protocol = require("../../shared/protocol");
const clientStore = require("../clientStore");
const logger = require("./logger");

const broadcast = {
  // 전체 전송 (나 포함 or 제외 선택 가능)
  toAll(msgObject, excludeSocket = null) {
    const data = Protocol.encode(msgObject);
    let count = 0;

    for (const client of clientStore.getAll()) {
      // 제외할 소켓이 있으면 건너뜀 (예: 내가 보낸 메시지는 나한테 다시 안 옴)
      if (client.socket === excludeSocket) continue;

      // 소켓이 아직 쓸 수 있는 상태인지 확인 (끊긴 소켓에 쓰면 에러남)
      if (!client.socket.destroyed) {
        client.socket.write(data);
        count++;
      }
    }

    return count; // 몇 명에게 전송했는지 반환
  },

  // 특정 소켓 한 명에게만 전송
  toOne(socket, msgObject) {
    if (socket.destroyed) return false;
    socket.write(Protocol.encode(msgObject));
    return true;
  },

  // 귓속말 — 보낸 사람과 받는 사람 둘 다에게 전송
  whisper(fromSocket, toSocket, msgObject) {
    const data = Protocol.encode(msgObject);
    if (!fromSocket.destroyed) fromSocket.write(data); // 보낸 사람 화면에도 표시
    if (!toSocket.destroyed) toSocket.write(data); // 받는 사람에게 전달
  },
};

module.exports = broadcast;
