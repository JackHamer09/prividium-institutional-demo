# Can be run on the local anvil for zksync era.

export L2_RPC_URL=http://0.0.0.0:3050
export L2_RPC_URL_SECOND=http://0.0.0.0:3051
# Rich wallet built into the anvil + received deposits during the initialization
export PRIVATE_KEY=0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110
npx ts-node examples/message-verify.ts
