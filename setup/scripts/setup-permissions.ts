/* eslint-disable no-console */
/**
 * Seeds institutional demo permissions into the Prividium postgres database:
 *   1. Token contracts (USDC, TUST, SGD) linked to the core 'erc-20' template
 *   2. RepoContract with all functions public (ABI loaded from artifact)
 *   3. OAuth app for the demo frontend
 *   4. Admin user with wallet address + admin role
 *   5. Wallet addresses for base users (user1, user2 seeded by core stack)
 *
 * Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE.
 * Reads contract addresses from /output/contracts.env (written by deploy-contracts.ts).
 * Requires the core stack to be seeded first (erc-20 template + user1/user2 must exist).
 * Bypasses the Prividium API entirely — no auth required.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toFunctionSelector } from "viem";
import type { AbiFunction } from "viem";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? "/output/contracts.env";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@postgres:5432/prividium_api";

const APP_ID = "institutional-demo-app";
const CLIENT_ID = "institutional-demo-client";

// Admin user (demo-specific — wallet linked here, role assigned via admin role seeding)
const ADMIN_USER = {
  id: "inst-demo-admin-000001",
  display: "admin@local.dev",
  sub: "00000000-0000-0000-0000-000000000001",
  wallet: "f39fd6e51aad88f6f4ce6ab8827279cfffb92266",
};

// Wallet addresses for base users (seeded by core stack, just need wallet linking here)
const BASE_USER_WALLETS = [
  { id: "local-user1", wallet: "ad350e768913dac29b8113c571fb3321c9d01495" },
  { id: "local-user2", wallet: "cfb389324acf2e0aad3ac5073166fe428f57fa89" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function readEnv(): Record<string, string> {
  if (!fs.existsSync(OUTPUT_PATH)) {
    throw new Error(`contracts.env not found at ${OUTPUT_PATH} — run 'deploy' first`);
  }
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(OUTPUT_PATH, "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) { result[line.slice(0, eq).trim()] = line.slice(eq + 1).trim(); }
  }
  return result;
}

function addr(hex: string): Buffer {
  return Buffer.from(hex.replace("0x", "").toLowerCase(), "hex");
}

function sel(hex: string): Buffer {
  return Buffer.from(hex.replace("0x", ""), "hex");
}

function formatSig(fn: AbiFunction): string {
  const params = fn.inputs.map((i) => (i.name ? `${i.type} ${i.name}` : i.type)).join(", ");
  return `function ${fn.name}(${params})`;
}

function accessType(fn: AbiFunction): "read" | "write" {
  return fn.stateMutability === "view" || fn.stateMutability === "pure" ? "read" : "write";
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const env = readEnv();
  const usdcAddr = env["NUXT_PUBLIC_USDC_ADDRESS"];
  const tustAddr = env["NUXT_PUBLIC_TUST_ADDRESS"];
  const sgdAddr = env["NUXT_PUBLIC_SGD_ADDRESS"];
  const repoAddr = env["NUXT_PUBLIC_INTRADAY_REPO_CONTRACT_ADDRESS"];

  if (!usdcAddr || !tustAddr || !sgdAddr || !repoAddr) {
    throw new Error("Missing contract addresses in contracts.env — run deploy first");
  }

  const sql = postgres(DATABASE_URL);

  try {
    // ── 1. Look up ERC-20 template seeded by core stack ───────────────────────
    const [erc20Template] = await sql<[{ id: number }]>`
      SELECT id FROM contract_templates WHERE template_key = 'erc-20'
    `;
    if (!erc20Template) {
      throw new Error("ERC-20 template not found — ensure the core stack seed has run first");
    }
    const templateId = erc20Template.id;
    console.log(`✅ ERC-20 template (id=${templateId})`);

    // ── 2. Token contracts linked to ERC-20 template ──────────────────────────
    for (const [address, name] of [[usdcAddr, "USDC"], [tustAddr, "TUST"], [sgdAddr, "SGD"]] as const) {
      await sql`
        INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
        VALUES (${addr(address)}, '[]', ${name}, NULL, false, false, ${templateId})
        ON CONFLICT (contract_address) DO NOTHING
      `;
      console.log(`✅ Contract: ${name} at ${address}`);
    }

    // ── 3. RepoContract (permissions derived from artifact ABI) ───────────────
    const contractsDir = process.env.CONTRACTS_DIR ?? path.join(__dirname, "..", "..", "contracts", "out");
    const artifactPath = path.join(contractsDir, "RepoContract.sol", "RepoContract.json");
    const repoArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const repoAbi: AbiFunction[] = (repoArtifact.abi as { type: string }[]).filter(
      (item) => item.type === "function",
    ) as AbiFunction[];
    const repoAbiJson = JSON.stringify(repoArtifact.abi);

    await sql`
      INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
      VALUES (${addr(repoAddr)}, ${repoAbiJson}, 'Intraday Repo', NULL, false, false, NULL)
      ON CONFLICT (contract_address) DO NOTHING
    `;

    for (const fn of repoAbi) {
      const selector = toFunctionSelector(fn);
      await sql`
        INSERT INTO contract_function_permissions
          (contract_address, method_selector, function_signature, rule_type, access_type)
        VALUES (${addr(repoAddr)}, ${sel(selector)}, ${formatSig(fn)}, 'public', ${accessType(fn)})
        ON CONFLICT (contract_address, method_selector) DO NOTHING
      `;
    }
    console.log(`✅ RepoContract at ${repoAddr} (${repoAbi.length} permissions)`);

    // ── 4. OAuth app ──────────────────────────────────────────────────────────
    await sql`
      INSERT INTO applications (id, name, description, oauth_client_id, oauth_redirect_uris, origin, is_public)
      VALUES (
        ${APP_ID},
        'Intraday Repo Demo',
        'Demo application for intraday repo lending. Allows users to create and accept collateralised lending offers using tokenised assets (USDC, TUST, SGD).',
        ${CLIENT_ID},
        ARRAY['http://localhost:3500/auth/callback']::text[],
        'http://localhost:3500',
        true
      )
      ON CONFLICT (oauth_client_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_public = EXCLUDED.is_public
    `;
    console.log(`✅ OAuth app: clientId=${CLIENT_ID}`);

    // ── 5. Admin user + wallet + role ─────────────────────────────────────────
    await sql`
      INSERT INTO roles (role_name, system_permissions, is_system_role)
      VALUES ('admin', '{contract_deployment,full_sequencer_rpc_access,full_read_access}', true)
      ON CONFLICT (role_name) DO NOTHING
    `;
    await sql`
      INSERT INTO users (id, display_name, oidc_sub, source)
      VALUES (${ADMIN_USER.id}, ${ADMIN_USER.display}, ${ADMIN_USER.sub}, 'oidc')
      ON CONFLICT (id) DO NOTHING
    `;
    await sql`
      INSERT INTO user_wallets (wallet_address, user_id)
      VALUES (${addr(ADMIN_USER.wallet)}, ${ADMIN_USER.id})
      ON CONFLICT (wallet_address) WHERE deleted_at IS NULL DO NOTHING
    `;
    await sql`
      INSERT INTO user_roles (user_id, role_name)
      VALUES (${ADMIN_USER.id}, 'admin')
      ON CONFLICT (user_id, role_name) DO NOTHING
    `;
    console.log(`✅ Admin user: ${ADMIN_USER.display}`);

    // ── 6. Wallet addresses for base users (already seeded by core stack) ─────
    for (const { id, wallet } of BASE_USER_WALLETS) {
      await sql`
        INSERT INTO user_wallets (wallet_address, user_id)
        VALUES (${addr(wallet)}, ${id})
        ON CONFLICT (wallet_address) WHERE deleted_at IS NULL DO NOTHING
      `;
      console.log(`✅ Wallet linked for user: ${id}`);
    }

    console.log("\n✅ Institutional demo permissions seed complete.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("❌ Permissions seed failed:", err);
  process.exit(1);
});
