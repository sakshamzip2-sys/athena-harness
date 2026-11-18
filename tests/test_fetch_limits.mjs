// web_fetch's HTTP reader must always finish: too-large bodies (plain or compressed) are refused at once, and a
// server that trickles bytes forever hits the overall deadline.   node tests/test_fetch_limits.mjs   (no network)
import { createJiti } from "../harness/node_modules/jiti/lib/jiti.mjs";
import * as http from "node:http";
import * as zlib from "node:zlib";
const jiti = createJiti(import.meta.url, { alias: { typebox: new URL("../harness/node_modules/typebox/build/index.mjs", import.meta.url).pathname } });
const { _getOnceForTest } = await jiti.import("../harness-ext/athena.ts");

const server = http.createServer((req, res) => {
  if (req.url === "/big") { res.writeHead(200); const mb = Buffer.alloc(1 << 20, 97); let i = 0;
    const send = () => { if (i++ < 8) res.write(mb, send); else res.end(); }; send(); }
  else if (req.url === "/bomb") { res.writeHead(200, { "content-encoding": "gzip" }); res.end(zlib.gzipSync(Buffer.alloc(50 << 20, 0))); }
  else if (req.url === "/trickle") { res.writeHead(200); const t = setInterval(() => res.write("x"), 200); req.on("close", () => clearInterval(t)); }
  else if (req.url === "/badgzip") { res.writeHead(200, { "content-encoding": "gzip" }); res.end("not gzip at all"); }
  else { res.writeHead(200); res.end("hello"); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;
const allowLocal = (host, opts, cb) => (opts && opts.all ? cb(null, [{ address: "127.0.0.1", family: 4 }]) : cb(null, "127.0.0.1", 4));

let bad = 0;
async function run(name, path, want, maxMs) {
  const t = Date.now();
  let got;
  try { got = "ok:" + (await _getOnceForTest(new URL(base + path), allowLocal, 2000)).body.slice(0, 20); }
  catch (e) { got = "error:" + e.message; }
  const ms = Date.now() - t, ok = want.test(got) && ms <= maxMs;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name} -> ${got.slice(0, 60)} (${ms} ms)`);
}
await run("normal page", "/", /^ok:hello/, 1500);
await run("8 MB body refused", "/big", /^error:.*too large/, 1500);
await run("gzip bomb refused", "/bomb", /^error:.*too large/, 1500);
await run("trickle hits the deadline", "/trickle", /^error:.*timed out/, 3000);
await run("broken gzip rejected", "/badgzip", /^error:/, 1500);
server.close();
console.log(bad ? `${bad} failed` : "all pass");
process.exit(bad ? 1 : 0);
