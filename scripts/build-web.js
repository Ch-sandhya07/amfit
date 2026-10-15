// Copies only the browser files into www/ for the native app. Server-side
// files (serve.py, data/, mail.json, functions/) must never ship in the APK/IPA.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");
const SHIP = ["index.html", "css", "js", "img", "models"];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of SHIP) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, path.join(out, item), { recursive: true });
}
console.log("www/ ready: " + SHIP.join(", "));
