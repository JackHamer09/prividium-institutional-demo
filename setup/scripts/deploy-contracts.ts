/* eslint-disable no-console */
/**
 * Deploys the institutional demo contracts to the local ZKsync chain:
 *   1. Funds demo user EOAs on L2 (ETH transfer from deployer)
 *   2. Deploys TestnetERC20Token x3 (USDC, TUST, SGD) + RepoContract
 *   3. Mints test tokens to demo users
 *   4. Writes deployed addresses to /output/contracts.env
 *
 * Idempotent: skips contracts that already have code at their expected address.
 * Env vars required: RPC_URL, L1_RPC_URL, DEPLOYER_PRIVATE_KEY, CHAIN_ID
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Abi,
  type Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  type Hex,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// CONTRACTS_DIR: Docker sets this via ENV; locally defaults to contracts/out/ (Foundry build output)
const CONTRACTS_DIR = process.env.CONTRACTS_DIR
  ?? path.join(__dirname, "..", "..", "contracts", "out");
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? "/output/contracts.env";

const L2_RPC = process.env.RPC_URL ?? "http://zksyncos:3050";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? "6565");
const DEPLOYER_PK = (process.env.DEPLOYER_PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as Hex;

// Demo user EOAs (Keycloak user1 and user2)
const DEMO_USERS: Address[] = [
  "0xAD350E768913dAc29b8113C571fB3321c9d01495",
  "0xcFB389324aCf2e0Aad3aC5073166fe428f57fA89",
];
const FUND_AMOUNT = parseEther("1");

// Mint amounts
const USDC_MINT = 10_000n * 10n ** 6n;     // 10,000 USDC (6 decimals)
const TUST_MINT = 100n * 10n ** 18n;        // 100 TUST
const SGD_MINT = 100n * 10n ** 18n;         // 100 SGD

function loadArtifact(name: string): { abi: Abi; bytecode: { object: Hex } } {
  return JSON.parse(
    fs.readFileSync(path.join(CONTRACTS_DIR, `${name}.sol`, `${name}.json`), "utf8"),
  );
}

function readExistingEnv(): Record<string, string> {
  if (!fs.existsSync(OUTPUT_PATH)) {return {};}
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(OUTPUT_PATH, "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) {result[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();}
  }
  return result;
}

function writeEnvFile(values: Record<string, string>) {
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {fs.mkdirSync(dir, { recursive: true });}
  const content = Object.entries(values).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`Written to ${OUTPUT_PATH}`);
}

async function hasCode(publicClient: ReturnType<typeof createPublicClient>, address: Address): Promise<boolean> {
  const code = await publicClient.getBytecode({ address });
  return !!code && code !== "0x";
}

async function deploy(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  label: string,
  abi: Abi,
  bytecode: Hex,
  args: readonly unknown[] = [],
): Promise<Address> {
  const hash = await walletClient.deployContract({ abi, bytecode, args } as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`${label} deployment failed`);
  }
  console.log(`✅ ${label}: ${receipt.contractAddress}`);
  return receipt.contractAddress as Address;
}

async function main() {
  const deployer = privateKeyToAccount(DEPLOYER_PK);
  console.log(`Deployer: ${deployer.address}`);

  const chain = defineChain({
    id: CHAIN_ID,
    name: "Local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [L2_RPC] }, public: { http: [L2_RPC] } },
  });
  const transport = http(L2_RPC);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ chain, transport, account: deployer });

  const existing = readExistingEnv();

  // ── 1. Fund demo users on L2 ──────────────────────────────────────────────
  for (const user of DEMO_USERS) {
    const balance = await publicClient.getBalance({ address: user });
    if (balance >= FUND_AMOUNT / 2n) {
      console.log(`⏭  ${user} already funded`);
      continue;
    }
    const hash = await walletClient.sendTransaction({ to: user, value: FUND_AMOUNT });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Funded ${user} with 100 ETH`);
  }

  // ── 2. Deploy contracts ───────────────────────────────────────────────────
  const ERC20Artifact = loadArtifact("TestnetERC20Token");
  const RepoArtifact = loadArtifact("RepoContract");

  async function ensure(key: string, label: string, abi: Abi, bytecode: Hex, args: readonly unknown[] = []): Promise<Address> {
    const configured = existing[key] as Address | undefined;
    if (configured && await hasCode(publicClient, configured)) {
      console.log(`⏭  ${label} already at ${configured}`);
      return configured;
    }
    return deploy(walletClient, publicClient, label, abi, bytecode, args);
  }

  const usdc = await ensure(
    "NUXT_PUBLIC_USDC_ADDRESS", "USDC (TestnetERC20Token)",
    ERC20Artifact.abi, ERC20Artifact.bytecode.object,
    ["USD Coin", "USDC", 6],
  );
  const tust = await ensure(
    "NUXT_PUBLIC_TUST_ADDRESS", "TUST (TestnetERC20Token)",
    ERC20Artifact.abi, ERC20Artifact.bytecode.object,
    ["Tokenized US Treasuries", "TUST", 18],
  );
  const sgd = await ensure(
    "NUXT_PUBLIC_SGD_ADDRESS", "SGD (TestnetERC20Token)",
    ERC20Artifact.abi, ERC20Artifact.bytecode.object,
    ["Singapore Dollar", "SGD", 18],
  );
  const repo = await ensure(
    "NUXT_PUBLIC_INTRADAY_REPO_CONTRACT_ADDRESS", "RepoContract",
    RepoArtifact.abi, RepoArtifact.bytecode.object,
    [deployer.address],
  );

  // ── 3. Mint test tokens ───────────────────────────────────────────────────
  const mintAbi = [
    { type: "function", name: "mint", inputs: [{ name: "_to", type: "address" }, { name: "_amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  ] as const;

  for (const user of DEMO_USERS) {
    for (const [tokenAddr, amount, symbol] of [[usdc, USDC_MINT, "USDC"], [tust, TUST_MINT, "TUST"], [sgd, SGD_MINT, "SGD"]] as const) {
      const { request } = await publicClient.simulateContract({
        account: deployer,
        address: tokenAddr,
        abi: mintAbi,
        functionName: "mint",
        args: [user, amount],
      });
      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ Minted ${symbol} to ${user}`);
    }
  }

  // ── 4. Write contracts.env ────────────────────────────────────────────────
  writeEnvFile({
    NUXT_PUBLIC_USDC_ADDRESS: usdc,
    NUXT_PUBLIC_TUST_ADDRESS: tust,
    NUXT_PUBLIC_SGD_ADDRESS: sgd,
    NUXT_PUBLIC_INTRADAY_REPO_CONTRACT_ADDRESS: repo,
  });

  console.log("\n📋 Institutional demo contract deployment complete.");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
