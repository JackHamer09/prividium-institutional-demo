# Running Interop Demo

Go to the following branch of zksync-os-server:
`draft-v31-zksync-os-with-shadow-accounts`: [https://github.com/matter-labs/zksync-os-server/tree/sb/interop-type-b-demo](https://github.com/matter-labs/zksync-os-server/tree/sb/interop-type-b-demo)

In three terminal windows run:

```bash
# Runs L1
anvil --load-state ./local-chains/v31/zkos-l1-state.json --port 8545

# Runs chain A
cargo run --release -- --config ./local-chains/v31/multiple-chains/chain1.json

# Runs chain B
cargo run --release -- --config ./local-chains/v31/multiple-chains/chain2.json
```

In the fourth terminal window, go to `cast-interop`: [https://github.com/mm-zk-codex/cast-interop](https://github.com/mm-zk-codex/cast-interop). Run the command below to enable automatic execution of all the bundles on the chains above:

```bash
cargo run --release -- auto-relay --rpc http://0.0.0.0:3050 http://0.0.0.0:3051 --private-key 0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110
```

To actually launch the demo, go to `repo-contract-demo` and run the `./start-tester.sh` script.

## SDK and Examples

To explore how the SDK works, check out:
- Its README
- `./examples` folder (these can also be launched by using the `./sdk/start-tester.sh` script!)
- The example of the repo contract demo

## Branches
- [zksync os server](https://github.com/matter-labs/zksync-os-server): draft-v31-zksync-os-with-shadow-accounts
- [era-contracts](https://github.com/matter-labs/era-contracts): draft-v31-zksync-os-with-shadow-accounts
- [zksync-era]: draft-v31
- [zksync-os-workflow]: main

Note, that the branches for zksync-era and zksync-os-workflow get regularly updated, so regeneration of the state may require syncing all the branches with their base ones.
