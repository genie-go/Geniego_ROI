import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const port = 8080;
const mime = {".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json"};

http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(__dirname, "public", u.pathname === "/" ? "index.html" : u.pathname);
  if (!filePath.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not Found"); }
    res.writeHead(200, {"Content-Type": mime[path.extname(filePath)] || "text/plain"});
    res.end(data);
  });
}).listen(port, () => console.log(`UI listening on ${port}`));
