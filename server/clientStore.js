// server/clientStore.js
'use strict';

/**
 * @file clientStore.js
 * @description 접속 중인 클라이언트 상태를 중앙 관리하는 모듈 (Single Source of Truth)
 *
 * [설계] Map<socket, clientObject> + nicknames Set
 * - Map: socket 객체 자체를 key로 사용 → O(1) 조회
 * - Set: 닉네임 중복 검사를 O(1)로 처리
 */

const { NICKNAME } = require('../shared/constants');

const clients   = new Map();   // Map<socket, client>
const nicknames = new Set();   // 닉네임 중복 방지
let guestCounter = 1;

const clientStore = {
  add(socket) {
    const nickname = `${NICKNAME.DEFAULT_PREFIX}${guestCounter++}`;
    const client = { socket, nickname, joinedAt: Date.now() };
    clients.set(socket, client);
    nicknames.add(nickname);
    return client;
  },

  remove(socket) {
    const client = clients.get(socket);
    if (!client) return null;
    nicknames.delete(client.nickname);
    clients.delete(socket);
    return client;
  },

  get(socket) {
    return clients.get(socket) || null;
  },

  findByNickname(nickname) {
    for (const client of clients.values()) {
      if (client.nickname === nickname) return client;
    }
    return null;
  },

  setNickname(socket, newNickname) {
    if (newNickname.length < NICKNAME.MIN_LENGTH || newNickname.length > NICKNAME.MAX_LENGTH) {
      return { ok: false, reason: `닉네임은 ${NICKNAME.MIN_LENGTH}~${NICKNAME.MAX_LENGTH}자여야 합니다.` };
    }
    if (nicknames.has(newNickname)) {
      return { ok: false, reason: `"${newNickname}"은 이미 사용 중입니다.` };
    }
    const client = clients.get(socket);
    if (!client) return { ok: false, reason: '클라이언트를 찾을 수 없습니다.' };

    nicknames.delete(client.nickname);
    client.nickname = newNickname;
    nicknames.add(newNickname);
    return { ok: true };
  },

  getAll() {
    return Array.from(clients.values());
  },

  count() {
    return clients.size;
  },
};

module.exports = clientStore;
