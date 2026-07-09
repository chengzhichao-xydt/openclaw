// Real-behavior proof: MCP bundle metadata text truncation must stay UTF-16 safe.
//
// Run with:
//   node --import tsx scripts/proof-agents-mcp-metadata-utf16-boundary.mts

import { sanitizeMcpMetadataText } from "../src/agents/agent-bundle-mcp-runtime.js";

const LIMIT = 1_200;

function hasLoneSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) {
      const next = s.charCodeAt(i + 1);
      if (i + 1 >= s.length || next < 0xDC00 || next > 0xDFFF) {
        return true;
      }
    }
    if (c >= 0xDC00 && c <= 0xDFFF) {
      const prev = s.charCodeAt(i - 1);
      if (i === 0 || prev < 0xD800 || prev > 0xDBFF) {
        return true;
      }
    }
  }
  return false;
}

function legacyTruncate(scrubbed: string): string {
  return scrubbed.length > LIMIT ? `${scrubbed.slice(0, LIMIT)}...` : scrubbed;
}

const text = "a".repeat(1_199) + "😀" + "suffix";

const legacy = legacyTruncate(text);
const sanitized = sanitizeMcpMetadataText(text);

console.log("input length:", text.length);
console.log("legacy length:", legacy.length);
console.log("legacy has lone surrogate:", hasLoneSurrogate(legacy));
console.log("sanitized length:", sanitized?.length);
console.log("sanitized has lone surrogate:", sanitized ? hasLoneSurrogate(sanitized) : "n/a");
console.log("sanitized ends with ellipsis:", sanitized?.endsWith("..."));

if (hasLoneSurrogate(legacy)) {
  console.log("\nConfirmed: legacy raw slice splits the surrogate pair.");
}

if (sanitized && !hasLoneSurrogate(sanitized) && sanitized.endsWith("...")) {
  console.log("PASS: sanitizeMcpMetadataText truncates without splitting surrogate pairs.");
  process.exit(0);
} else {
  console.error("FAIL: expected surrogate-safe truncation ending with '...'.");
  process.exit(1);
}
