// server/clientStore.js
"use strict";

const { NICKNAME } = require("../shared/constants");

// 핵심 자료구조: Map<socket, clientObject>
// 객체({})가 아니라 Map을 쓰는 이유 → socket 객체 자체를 key로 쓸 수 있기 때문
const clients = new Map();

// 닉네임 중복 방지용 Set
const nicknames = new Set();

// Guest 번호 카운터 (Guest1, Guest2...)
let guestCounter = 1;

const clientStore = {
  // 새 클라이언트 등록
  add(socket) {
    const nickname = `${NICKNAME.DEFAULT_PREFIX}${guestCounter++}`;
    const client = {
      socket,
      nickname,
      joinedAt: Date.now(),
    };
    clients.set(socket, client);
    nicknames.add(nickname);
    return client; // 등록된 클라이언트 정보 반환
  },

  // 클라이언트 제거 (연결 끊길 때)
  remove(socket) {
    const client = clients.get(socket);
    if (!client) return null;
    nicknames.delete(client.nickname);
    clients.delete(socket);
    return client; // 제거된 클라이언트 정보 반환 (퇴장 메시지에 씀)
  },

  // socket으로 클라이언트 정보 조회
  get(socket) {
    return clients.get(socket) || null;
  },

  // 닉네임으로 클라이언트 검색 (/w 귓속말에서 씀)
  findByNickname(nickname) {
    for (const client of clients.values()) {
      if (client.nickname === nickname) return client;
    }
    return null;
  },

  // 닉네임 변경
  setNickname(socket, newNickname) {
    // 1. 길이 검사
    if (newNickname.length < NICKNAME.MIN_LENGTH || newNickname.length > NICKNAME.MAX_LENGTH) {
      return { ok: false, reason: `닉네임은 ${NICKNAME.MIN_LENGTH}~${NICKNAME.MAX_LENGTH}자여야 합니다.` };
    }

    // 2. 중복 검사
    if (nicknames.has(newNickname)) {
      return { ok: false, reason: `"${newNickname}"은 이미 사용 중입니다.` };
    }

    // 3. 변경 적용
    const client = clients.get(socket);
    if (!client) return { ok: false, reason: "클라이언트를 찾을 수 없습니다." };

    nicknames.delete(client.nickname); // 기존 닉네임 해제
    client.nickname = newNickname; // 새 닉네임 적용
    nicknames.add(newNickname); // 새 닉네임 등록

    return { ok: true };
  },

  // 전체 클라이언트 목록 반환 (/list 명령어에서 씀)
  getAll() {
    return Array.from(clients.values());
  },

  // 현재 접속자 수
  count() {
    return clients.size;
  },
};

module.exports = clientStore;
