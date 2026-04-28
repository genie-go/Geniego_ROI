const stub = require("./stub");
const meta = require("./meta");
const naver = require("./naver");
const tiktok = require("./tiktok");
const instagram = require("./instagram");
const amazon_ads = require("./amazon_ads");
const shopify = require("./shopify");
const qoo10 = require("./qoo10");
const rakuten = require("./rakuten");
const coupang = require("./coupang");

// Replace per channel when implemented.
module.exports = {
  stub,
  meta,
  instagram,
  naver,
  google: stub,
  tiktok,
  amazon_ads,
  shopify,
  qoo10,
  rakuten,
  coupang,
  kakao: stub,
};
