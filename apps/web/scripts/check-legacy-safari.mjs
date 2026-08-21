import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "acorn";

const assetsDir = path.resolve("dist/assets");
const unsupported = [];

function listJavaScriptFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = path.join(dir, entry);
    if (statSync(filePath).isDirectory()) return listJavaScriptFiles(filePath);
    if (!entry.endsWith(".js")) return [];
    if (entry.startsWith("qr-scanner-worker")) return [];
    return [filePath];
  });
}

function walk(node, filePath) {
  if (!node || typeof node !== "object") return;

  if (node.type === "ChainExpression") {
    unsupported.push(`${filePath}: optional chaining is not allowed in legacy Safari bundle`);
  }

  if (node.type === "LogicalExpression" && node.operator === "??") {
    unsupported.push(`${filePath}: nullish coalescing is not allowed in legacy Safari bundle`);
  }

  if (node.type === "AssignmentExpression" && ["??=", "||=", "&&="].includes(node.operator)) {
    unsupported.push(`${filePath}: logical assignment (${node.operator}) is not allowed`);
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "start" || key === "end" || key === "loc") continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, filePath);
      continue;
    }
    walk(value, filePath);
  }
}

for (const filePath of listJavaScriptFiles(assetsDir)) {
  const source = readFileSync(filePath, "utf8");
  let ast;
  try {
    ast = parse(source, {
      ecmaVersion: 2020,
      sourceType: "module",
    });
  } catch (error) {
    unsupported.push(`${filePath}: ${error.message}`);
    continue;
  }
  walk(ast, filePath);
}

if (unsupported.length > 0) {
  console.error("Legacy Safari compatibility check failed:\n");
  for (const error of unsupported) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Legacy Safari compatibility check passed.");
