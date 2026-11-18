// End-to-end check of the optional web_fetch tool, called the way the harness calls it (registered tool execute).
//   node tests/test_web_tools.mjs        (needs network; exit 0 = all pass)
// Cases: public page via Agent Reach; private/special addresses refused; a reader that reports a non-remote
// backend is ignored (falls back to the checked local fetch); works without agent-reach on PATH.
import { createJiti } from "../harness/node_modules/jiti/lib/jiti.mjs";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
const jiti = createJiti(import.meta.url, { alias: { typebox: new URL("../harness/node_modules/typebox/build/index.mjs", import.meta.url).pathname } });
process.env.ATHENA_CODING_AGENT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "athena-test-"));
const ext = (await jiti.import("../harness-ext/athena.ts")).default;
const tools = {};
ext({ on() {}, registerTool(t) { tools[t.name] = t; } });
const fetchTool = async (url) => (await tools.web_fetch.execute("t", { url, max_chars: 4000 })).content[0].text;

let bad = 0;
const check = (name, ok, got) => { if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ": " + got.slice(0, 200)}`); };

let t = await fetchTool("https://example.com");
check("public page", /Example Domain|documentation examples/.test(t), t);
for (const u of ["http://127.0.0.1:8000/", "http://169.254.169.254/latest/meta-data/", "http://[::1]/",
                 "http://[64:ff9b:1::a00:1]/", "http://[2001:0:4136:e378:8000:63bf:3fff:fdd2]/", "http://localhost/",
                 "file:///etc/passwd"]) {
  t = await fetchTool(u);
  check(`refuse ${u}`, /web_fetch failed: (refusing|only http)/.test(t), t);
}

// A reader claiming a local backend must be ignored: fake agent-reach first on PATH.
const fake = fs.mkdtempSync(path.join(os.tmpdir(), "fake-ar-"));
fs.writeFileSync(path.join(fake, "agent-reach"),
  "#!/bin/sh\necho '{\"ok\":true,\"backend\":\"local-http\",\"items\":[{\"text\":\"" + "INJECTED ".repeat(40) + "\"}]}'\n", { mode: 0o755 });
const savedPath = process.env.PATH;
process.env.PATH = fake + ":" + savedPath;
t = await fetchTool("https://example.com");
check("non-remote backend ignored", !/INJECTED/.test(t) && /Example Domain|documentation examples/.test(t), t);

// Public users: no agent-reach at all.
process.env.PATH = "/usr/bin:/bin";
t = await fetchTool("https://example.com");
check("works without agent-reach", /Example Domain|documentation examples/.test(t), t);
process.env.PATH = savedPath;

console.log(bad ? `${bad} failed` : "all pass");
process.exit(bad ? 1 : 0);
