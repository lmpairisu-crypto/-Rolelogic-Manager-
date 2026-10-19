// Downloads the official OzVault CLI and verifies the published SHA-256 before use.
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const crypto = require("node:crypto");

const CLI_URL = "https://ozvault.lol/cli/ozvault-0.1.0.mjs";
const EXPECTED_SHA256 = "0f659a112aba912996215675e2a3a02fb95f2b60a75ada460b55bfce7789ba00";
const DEST = path.join(__dirname, "ozvault.mjs");

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Too many redirects downloading OzVault CLI"));
    https.get(url, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (!response.headers.location) return reject(new Error("OzVault CLI redirect missing location"));
        return resolve(download(new URL(response.headers.location, url).toString(), redirects + 1));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`OzVault CLI download returned HTTP ${response.statusCode}`));
      }
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

(async () => {
  try {
    const bytes = await download(CLI_URL);
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    if (digest !== EXPECTED_SHA256) throw new Error("OzVault CLI SHA-256 verification failed; refusing to install it.");
    fs.writeFileSync(DEST, bytes, { mode: 0o600 });
    console.log("[OzVault] Official CLI downloaded and SHA-256 verified.");
  } catch (error) {
    // Keep npm install from breaking the existing Discord bot if OzVault is unavailable.
    console.warn(`[OzVault] CLI install skipped: ${error.message}`);
    console.warn("[OzVault] Local bot features will still run, but encrypted backups need the verified CLI file.");
  }
})();
