const stub = require("./stub");
// Default to stub. Replace per channel when implemented.
module.exports = {
  stub,
  meta: stub,   // TODO: require("./meta")
  naver: stub,  // TODO: require("./naver")
  google: stub,
  tiktok: stub,
  kakao: stub,
};
