// scripts/copy-assets.js
// Copies static files (manifest, popup.html, popup.css, icons) into dist/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// Files to copy
const filesToCopy = [
  { src: "manifest.json", dest: "manifest.json" },
  { src: "src/popup.html", dest: "popup.html" },
  { src: "src/popup.css", dest: "popup.css" },
];

ensureDir(DIST);

for (const { src, dest } of filesToCopy) {
  copyFile(path.join(ROOT, src), path.join(DIST, dest));
  console.log(`  Copied ${src} -> dist/${dest}`);
}

// Copy icons
const iconsDir = path.join(ROOT, "artifacts", "icons");
if (fs.existsSync(iconsDir)) {
  const distIcons = path.join(DIST, "icons");
  ensureDir(distIcons);
  for (const file of fs.readdirSync(iconsDir)) {
    copyFile(path.join(iconsDir, file), path.join(distIcons, file));
    console.log(`  Copied artifacts/icons/${file} -> dist/icons/${file}`);
  }
}

console.log("Assets copied successfully.");
