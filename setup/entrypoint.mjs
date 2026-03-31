#!/usr/bin/env node
/**
 * Entrypoint for the institutional-demo setup image.
 * Usage: node entrypoint.mjs deploy | node entrypoint.mjs seed
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];

if (command !== "deploy" && command !== "seed") {
  console.error("Usage: node entrypoint.mjs <deploy|seed>");
  console.error(`Got: ${command ?? "(none)"}`);
  process.exit(1);
}

const script = command === "deploy"
  ? path.join(__dirname, "scripts", "deploy-contracts.ts")
  : path.join(__dirname, "scripts", "setup-permissions.ts");

const result = spawnSync(
  "node",
  ["--import", "tsx/esm", script],
  { stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
