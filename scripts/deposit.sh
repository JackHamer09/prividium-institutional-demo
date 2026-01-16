#!/bin/bash

# Deposit ETH from L1 to L2 via the bridge contract
# Usage: ./scripts/deposit.sh <chain-id> <to-address> <amount-in-wei> <private-key> <l1-rpc> <l2-rpc>

set -e

# Check arguments
if [ "$#" -ne 6 ]; then
    echo "Usage: $0 <chain-id> <to-address> <amount-in-wei> <private-key> <l1-rpc> <l2-rpc>"
    echo ""
    echo "Arguments:"
    echo "  chain-id       - The L2 chain ID to deposit to"
    echo "  to-address     - The recipient address on L2"
    echo "  amount-in-wei  - Amount to deposit in wei (e.g., 1000000000000000000 for 1 ETH)"
    echo "  private-key    - Private key of the sender (with 0x prefix)"
    echo "  l1-rpc         - L1 RPC URL (e.g., http://127.0.0.1:8545)"
    echo "  l2-rpc         - L2 RPC URL (e.g., http://127.0.0.1:3050)"
    echo ""
    echo "Example:"
    echo "  $0 6565 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1000000000000000000000 0xac0974... http://127.0.0.1:8545 http://127.0.0.1:3050"
    exit 1
fi

CHAIN_ID=$1
TO_ADDRESS=$2
AMOUNT=$3
PRIVATE_KEY=$4
L1_RPC=$5
L2_RPC=$6

echo "Fetching Bridgehub contract address from L2..."

# Get the Bridgehub contract address from L2
BRIDGEHUB_RESPONSE=$(curl -sf -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"zks_getBridgehubContract","params":[],"id":1}' \
    "$L2_RPC")

BRIDGE_CONTRACT=$(echo "$BRIDGEHUB_RESPONSE" | grep -o '"result":"0x[a-fA-F0-9]*"' | cut -d'"' -f4)

if [ -z "$BRIDGE_CONTRACT" ] || [ "$BRIDGE_CONTRACT" = "null" ]; then
    echo "Error: Failed to fetch Bridgehub contract address from L2"
    echo "Response: $BRIDGEHUB_RESPONSE"
    exit 1
fi

echo "Bridgehub contract: $BRIDGE_CONTRACT"
echo ""
echo "Depositing to L2..."
echo "  Chain ID: $CHAIN_ID"
echo "  To: $TO_ADDRESS"
echo "  Amount: $AMOUNT wei"
echo "  L1 RPC: $L1_RPC"
echo ""

cast send \
    -r "$L1_RPC" \
    "$BRIDGE_CONTRACT" \
    "requestL2TransactionDirect((uint256,uint256,address,uint256,bytes,uint256,uint256,bytes[],address))" \
    "($CHAIN_ID,$AMOUNT,$TO_ADDRESS,0,0x,72000000,800,[],$TO_ADDRESS)" \
    --value "$AMOUNT" \
    --private-key "$PRIVATE_KEY" \
    --gas-limit 10000000 \
    --legacy

echo ""
echo "Deposit transaction sent!"
