#!/bin/bash

# Deposit ETH from L1 (Sepolia) to L2 via the bridge contract
# Usage: ./scripts/deposit.sh <chain-id> <to-address> <amount-in-wei> <private-key>

set -e

# Check arguments
if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <chain-id> <to-address> <amount-in-wei> <private-key>"
    echo ""
    echo "Arguments:"
    echo "  chain-id       - The L2 chain ID to deposit to"
    echo "  to-address     - The recipient address on L2"
    echo "  amount-in-wei  - Amount to deposit in wei (e.g., 1000000000000000 for 0.001 ETH)"
    echo "  private-key    - Private key of the sender (without 0x prefix)"
    echo ""
    echo "Example:"
    echo "  $0 270 0x1234...5678 1000000000000000 abc123...def"
    exit 1
fi

CHAIN_ID=$1
TO_ADDRESS=$2
AMOUNT=$3
PRIVATE_KEY=$4

# L1 Sepolia RPC and bridge contract
L1_RPC="https://ethereum-sepolia-rpc.publicnode.com"
BRIDGE_CONTRACT="0xc4FD2580C3487bba18D63f50301020132342fdbD"

echo "Depositing to L2..."
echo "  Chain ID: $CHAIN_ID"
echo "  To: $TO_ADDRESS"
echo "  Amount: $AMOUNT wei"
echo ""

cast send \
    -r "$L1_RPC" \
    "$BRIDGE_CONTRACT" \
    "requestL2TransactionDirect((uint256,uint256,address,uint256,bytes,uint256,uint256,bytes[],address))" \
    "($CHAIN_ID,$AMOUNT,$TO_ADDRESS,50,0x,300000,800,[],$TO_ADDRESS)" \
    --value "$AMOUNT" \
    --private-key "$PRIVATE_KEY"

echo ""
echo "Deposit transaction sent!"
