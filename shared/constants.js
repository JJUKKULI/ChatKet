// shared/constants.js
'use strict';

const CONSTANTS = {
  SERVER: {
    HOST: 'localhost',
    PORT: 3000,        // TCP (CLI용)
    WS_PORT: 3002,     // WebSocket (React용)
    MAX_CLIENTS: 50,
  },
  MSG_TYPE: {
    CHAT: 'chat',
    SYSTEM: 'system',
    WHISPER: 'whisper',
    ERROR: 'error',
    INFO: 'info',
  },
  COMMANDS: {
    NICK: '/nick',
    WHISPER: '/w',
    LIST: '/list',
    HELP: '/help',
    QUIT: '/quit',
  },
  NICKNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 20,
    DEFAULT_PREFIX: 'Guest',
  },
};

module.exports = CONSTANTS;
