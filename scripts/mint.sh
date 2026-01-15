#!/bin/bash

# Mint test tokens to an address
# Usage: ./scripts/mint.sh <to-address> <token-address> <amount> <private-key> <rpc-url>

set -e

# Check arguments
if [ "$#" -ne 5 ]; then
    echo "Usage: $0 <to-address> <token-address> <amount> <private-key> <rpc-url>"
    echo ""
    echo "Arguments:"
    echo "  to-address     - The recipient address"
    echo "  token-address  - The token contract address (USDC, TTBILL, or SGD)"
    echo "  amount         - Amount in smallest unit (include decimals)"
    echo "  private-key    - Private key of the minter (without 0x prefix)"
    echo "  rpc-url        - RPC URL of the network"
    echo ""
    echo "Decimal reference:"
    echo "  USDC:   6 decimals  (1 USDC = 1000000)"
    echo "  TTBILL: 18 decimals (1 TTBILL = 1000000000000000000)"
    echo "  SGD:    18 decimals (1 SGD = 1000000000000000000)"
    echo ""
    echo "Example (mint 1000 USDC):"
    echo "  $0 0xRecipient 0xUSDCAddress 1000000000 abc123...def http://localhost:3050"
    exit 1
fi

TO_ADDRESS=$1
TOKEN_ADDRESS=$2
AMOUNT=$3
PRIVATE_KEY=$4
RPC_URL=$5

echo "Minting tokens..."
echo "  To: $TO_ADDRESS"
echo "  Token: $TOKEN_ADDRESS"
echo "  Amount: $AMOUNT"
echo ""

cast send \
    -r "$RPC_URL" \
    "$TOKEN_ADDRESS" \
    "mint(address,uint256)" \
    "$TO_ADDRESS" "$AMOUNT" \
    --private-key "$PRIVATE_KEY"

echo ""
echo "Mint transaction sent!"
