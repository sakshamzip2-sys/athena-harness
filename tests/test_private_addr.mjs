// Table test for web_fetch's address filter (harness-ext/athena.ts privateAddr).
//   node tests/test_private_addr.mjs      exit 0 = all rows pass
// true = refused (private, local, special or unparseable), false = public, allowed.
import { createJiti } from "../harness/node_modules/jiti/lib/jiti.mjs";
const jiti = createJiti(import.meta.url, { alias: { typebox: new URL("../harness/node_modules/typebox/build/index.mjs", import.meta.url).pathname } });
const { privateAddr } = await jiti.import("../harness-ext/athena.ts");

const rows = [
  // IPv4
  ["8.8.8.8", false], ["1.1.1.1", false], ["93.184.216.34", false],
  ["0.0.0.0", true], ["10.1.2.3", true], ["127.0.0.1", true], ["169.254.169.254", true], ["172.16.0.1", true],
  ["172.31.255.255", true], ["172.32.0.1", false], ["192.168.1.1", true], ["100.64.0.1", true], ["198.18.0.1", true],
  ["224.0.0.1", true], ["255.255.255.255", true],
  // IPv6 public (global unicast 2000::/3)
  ["2606:4700:4700::1111", false], ["2001:4860:4860::8888", false], ["2a00:1450:4001::200e", false],
  // IPv6 local and special
  ["::", true], ["::1", true], ["fe80::1", true], ["fc00::1", true], ["fd12:3456::1", true], ["ff02::1", true],
  ["2001:db8::1", true],                 // documentation
  ["2001::1", true], ["2001:0:4136:e378:8000:63bf:3fff:fdd2", true],  // Teredo 2001::/32 (in 2001::/23 special)
  ["2001:10::1", true],                  // ORCHID, 2001::/23 special block
  ["100::1", true],                      // discard 100::/64 (outside 2000::/3)
  ["64:ff9b:1::a00:1", true], ["64:ff9b:1::808:808", true],  // local-use NAT64 64:ff9b:1::/48: refuse all
  ["::ffff:0:a00:1", true], ["::ffff:0:808:808", true],      // IPv4-translated ::ffff:0:0:0/96: refuse all
  ["5f00::1", true],                     // SRv6 SIDs, not global unicast
  // IPv4 embedded in IPv6: decided by the embedded address
  ["::ffff:127.0.0.1", true], ["::ffff:10.0.0.1", true], ["::ffff:8.8.8.8", false], ["::ffff:808:808", false],
  ["::127.0.0.1", true],
  ["64:ff9b::127.0.0.1", true], ["64:ff9b::8.8.8.8", false],  // well-known NAT64 /96
  ["2002:7f00:1::", true], ["2002:a00:1::", true], ["2002:808:808::", false],  // 6to4
  // unparseable
  ["not-an-ip", true], ["1:2:3:4:5:6:7:8:9", true], ["::ffff:999.1.1.1", true],
];
let bad = 0;
for (const [ip, want] of rows) {
  const got = privateAddr(ip);
  if (got !== want) { bad++; console.log(`FAIL ${ip}: got ${got ? "refused" : "allowed"}, want ${want ? "refused" : "allowed"}`); }
}
console.log(`${rows.length - bad}/${rows.length} rows pass`);
process.exit(bad ? 1 : 0);
