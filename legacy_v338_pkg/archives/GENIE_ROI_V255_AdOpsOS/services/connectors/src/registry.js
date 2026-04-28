const meta = require("./adapters/meta");
const google = require("./adapters/google");
const tiktok = require("./adapters/tiktok");
const naver = require("./adapters/naver");
const kakao = require("./adapters/kakao");

const map = { meta, google, tiktok, naver, kakao };

function getAdapter(channel) {
  const a = map[channel];
  if (!a) {
    const err = new Error(`unsupported channel: ${channel}`);
    err.status = 400;
    throw err;
  }
  return a;
}

module.exports = { getAdapter };
