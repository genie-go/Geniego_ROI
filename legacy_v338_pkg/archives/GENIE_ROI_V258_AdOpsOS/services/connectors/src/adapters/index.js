const stub = require("./stub");

// Map channel -> adapter (default stub)
module.exports = {
  stub,
  meta: stub,
  google: stub,
  tiktok: stub,
  naver: stub,
  kakao: stub,
};
