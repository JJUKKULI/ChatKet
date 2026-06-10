// server/utils/broadcast.js
'use strict';

const Protocol    = require('../../shared/protocol');
const clientStore = require('../clientStore');

const broadcast = {
  // 전체 전송 (excludeSocket 지정 시 해당 소켓 제외)
  toAll(msgObject, excludeSocket = null) {
    const data = Protocol.encode(msgObject);
    let count = 0;
    for (const client of clientStore.getAll()) {
      if (client.socket === excludeSocket) continue;
      if (!client.socket.destroyed) {
        client.socket.write(data);
        count++;
      }
    }
    return count;
  },

  // 특정 소켓 한 명에게만 전송
  toOne(socket, msgObject) {
    if (socket.destroyed) return false;
    socket.write(Protocol.encode(msgObject));
    return true;
  },

  // 귓속말 — 보낸 사람 + 받는 사람 둘 다에게
  whisper(fromSocket, toSocket, msgObject) {
    const data = Protocol.encode(msgObject);
    if (!fromSocket.destroyed) fromSocket.write(data);
    if (!toSocket.destroyed)   toSocket.write(data);
  },
};

module.exports = broadcast;
