
#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const ICONS_DIR = path.join(ROOT_DIR, "components", "icons");

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

const iconImports = new Set();
const importRegex = /from\s+['"](.+\/icons\/([A-Za-z0-9_-]+))['"]/g;

walk(ROOT_DIR).forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRegex.exec(content))) {
    iconImports.add(match[2]);
  }
});

iconImports.forEach((iconName) => {
  const filePath = path.join(ICONS_DIR, `${iconName}.tsx`);
  if (fs.existsSync(filePath)) return;

  console.log(`[Build Engine] Generating stub for missing icon: ${iconName}`);
  const stub = `import React from "react";

export const ${iconName}: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
`;
  fs.writeFileSync(filePath, stub);
});
