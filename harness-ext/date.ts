/**
 * Today's date in the system prompt (Linear OC-186). Athena's built-in knowledge has a cutoff; without the date it
 * guesses one (live check 2026-11-18: "2026-07-25"). Loaded by the launcher unless ATHENA_DATE=0, which gives the
 * byte-identical prompt. When the optional tools (athena.ts) are loaded they set a fuller section and this one yields.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    const sections = event.systemPromptOptions.sections;
    if (sections["environment"]) return;
    sections["environment"] = `Today is ${new Date().toDateString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone}).\n` +
      "Your built-in knowledge has a cutoff, so it can be out of date about recent events, versions and prices; say so " +
      "when that matters.";
  });
}
