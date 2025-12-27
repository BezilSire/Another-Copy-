#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(process.cwd(), "src");
const ICONS_DIR = path.join(SRC_DIR, "components", "icons");

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

const iconImports = new Set();
const importRegex = /from\\s+['"](.+\\/icons\\/([A-Za-z0-9_-]+))['"]/g;

walk(SRC_DIR).forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRegex.exec(content))) {
    iconImports.add(match[2]);
  }
});

iconImports.forEach((iconName) => {
  const filePath = path.join(ICONS_DIR, `${iconName}.tsx`);
  if (fs.existsSync(filePath)) return;

  const stub = `import React from "react";

export default function ${iconName}() {
  return null;
}
`;
  fs.writeFileSync(filePath, stub);
});
