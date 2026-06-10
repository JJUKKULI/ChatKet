// server/utils/logger.js
'use strict';

const COLOR = {
  reset:'\x1b[0m', gray:'\x1b[90m', green:'\x1b[32m',
  yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', blue:'\x1b[34m',
};

function timestamp() {
  return new Date().toLocaleTimeString('ko-KR', { hour12: false });
}

const logger = {
  info(msg)    { console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.blue}ℹ ${msg}${COLOR.reset}`); },
  success(msg) { console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.green}✓ ${msg}${COLOR.reset}`); },
  warn(msg)    { console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.yellow}⚠ ${msg}${COLOR.reset}`); },
  error(msg)   { console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.red}✖ ${msg}${COLOR.reset}`); },
  chat(from, msg) { console.log(`${COLOR.gray}[${timestamp()}]${COLOR.reset} ${COLOR.cyan}💬 ${from}:${COLOR.reset} ${msg}`); },
};

module.exports = logger;
