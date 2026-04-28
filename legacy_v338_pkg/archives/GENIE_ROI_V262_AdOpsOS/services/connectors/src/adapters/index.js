const stub = require("./stub");
const meta = require("./meta");
const naver = require("./naver");

// Replace per channel when implemented.
module.exports = {
  stub,
  meta,
  naver,  // template + signed request scaffold
  google: stub,
  tiktok: stub,
  kakao: stub,
};
