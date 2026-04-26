import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, "..", "package.json");
const outputPath = path.join(__dirname, "..", "src", "lib", "appVersion.ts");

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const versionName = String(pkg.version || "0.0.0").trim();

const parts = versionName.split(".").map((value) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
});

const major = parts[0] || 0;
const minor = parts[1] || 0;
const patch = parts[2] || 0;

const versionCode = major * 10000 + minor * 100 + patch;

const content = `export const APP_VERSION_NAME = "${versionName}";
export const APP_VERSION_CODE = ${versionCode};
`;

fs.writeFileSync(outputPath, content, "utf8");

console.log("Version synchronisee :", {
  versionName,
  versionCode,
  outputPath,
});
