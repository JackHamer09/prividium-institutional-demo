-- Seed script for permissions_api_l2a database
-- Seeds contract templates, contracts, permissions, and user wallet data
-- Run with: docker exec -i zksync-prividium-institutional-demo-postgres-1 psql -U postgres -d permissions_api_l2a < prividium-utils/dev/seed-permissions-l2a.sql

-- ============================================================================
-- 1. Contract Templates
-- ============================================================================
INSERT INTO contract_templates (id, template_key, name, description, abi)
OVERRIDING SYSTEM VALUE
VALUES (
    1,
    'erc-20',
    'ERC-20 (mintable)',
    'Testnet ERC-20 (Mintable)',
    '[{"type":"constructor","inputs":[{"name":"name_","internalType":"string","type":"string"},{"name":"symbol_","internalType":"string","type":"string"},{"name":"decimals_","internalType":"uint8","type":"uint8"}],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"owner","internalType":"address","type":"address"},{"name":"spender","internalType":"address","type":"address"}],"name":"allowance","outputs":[{"name":"","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"spender","internalType":"address","type":"address"},{"name":"value","internalType":"uint256","type":"uint256"}],"name":"approve","outputs":[{"name":"","internalType":"bool","type":"bool"}],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"account","internalType":"address","type":"address"}],"name":"balanceOf","outputs":[{"name":"","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"function","inputs":[],"name":"decimals","outputs":[{"name":"","internalType":"uint8","type":"uint8"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"_to","internalType":"address","type":"address"},{"name":"_amount","internalType":"uint256","type":"uint256"}],"name":"mint","outputs":[{"name":"","internalType":"bool","type":"bool"}],"stateMutability":"nonpayable"},{"type":"function","inputs":[],"name":"name","outputs":[{"name":"","internalType":"string","type":"string"}],"stateMutability":"view"},{"type":"function","inputs":[],"name":"symbol","outputs":[{"name":"","internalType":"string","type":"string"}],"stateMutability":"view"},{"type":"function","inputs":[],"name":"totalSupply","outputs":[{"name":"","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"to","internalType":"address","type":"address"},{"name":"value","internalType":"uint256","type":"uint256"}],"name":"transfer","outputs":[{"name":"","internalType":"bool","type":"bool"}],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"from","internalType":"address","type":"address"},{"name":"to","internalType":"address","type":"address"},{"name":"value","internalType":"uint256","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","internalType":"bool","type":"bool"}],"stateMutability":"nonpayable"},{"type":"event","anonymous":false,"inputs":[{"name":"owner","internalType":"address","type":"address","indexed":true},{"name":"spender","internalType":"address","type":"address","indexed":true},{"name":"value","internalType":"uint256","type":"uint256","indexed":false}],"name":"Approval"},{"type":"event","anonymous":false,"inputs":[{"name":"from","internalType":"address","type":"address","indexed":true},{"name":"to","internalType":"address","type":"address","indexed":true},{"name":"value","internalType":"uint256","type":"uint256","indexed":false}],"name":"Transfer"},{"type":"error","inputs":[{"name":"spender","internalType":"address","type":"address"},{"name":"allowance","internalType":"uint256","type":"uint256"},{"name":"needed","internalType":"uint256","type":"uint256"}],"name":"ERC20InsufficientAllowance"},{"type":"error","inputs":[{"name":"sender","internalType":"address","type":"address"},{"name":"balance","internalType":"uint256","type":"uint256"},{"name":"needed","internalType":"uint256","type":"uint256"}],"name":"ERC20InsufficientBalance"},{"type":"error","inputs":[{"name":"approver","internalType":"address","type":"address"}],"name":"ERC20InvalidApprover"},{"type":"error","inputs":[{"name":"receiver","internalType":"address","type":"address"}],"name":"ERC20InvalidReceiver"},{"type":"error","inputs":[{"name":"sender","internalType":"address","type":"address"}],"name":"ERC20InvalidSender"},{"type":"error","inputs":[{"name":"spender","internalType":"address","type":"address"}],"name":"ERC20InvalidSpender"}]'
)
ON CONFLICT (template_key) DO NOTHING;

-- Reset sequence for contract_templates
SELECT setval('contract_templates_id_seq', COALESCE((SELECT MAX(id) FROM contract_templates), 0) + 1, false);

-- ============================================================================
-- 2. Contracts (ERC-20 tokens + Repo contract)
-- ============================================================================
-- USDC token
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('e7f1725e7734ce288f8367e1bb143e90bb3f0512', 'hex'),
    '[]',
    'USDC',
    NULL,
    false,
    false,
    1
)
ON CONFLICT (contract_address) DO NOTHING;

-- TUST token
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('9fe46736679d2d9a65f0992f2272de9f3c7fa6e0', 'hex'),
    '[]',
    'TUST',
    NULL,
    false,
    false,
    1
)
ON CONFLICT (contract_address) DO NOTHING;

-- SGD token
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('cf7ed3acca5a467e9e704c703e8d87f634fb0fc9', 'hex'),
    '[]',
    'SGD',
    NULL,
    false,
    false,
    1
)
ON CONFLICT (contract_address) DO NOTHING;

-- Intraday Repo contract
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'),
    '[{"type":"constructor","inputs":[{"name":"_admin","internalType":"address","type":"address"}],"stateMutability":"nonpayable"},{"type":"receive","stateMutability":"payable"},{"type":"function","inputs":[{"name":"_offerId","internalType":"uint256","type":"uint256"},{"name":"_borrowerChainId","internalType":"uint256","type":"uint256"},{"name":"_borrowerRefundAddress","internalType":"address","type":"address"}],"name":"acceptOffer","outputs":[],"stateMutability":"nonpayable"},{"type":"function","inputs":[],"name":"admin","outputs":[{"name":"","internalType":"address","type":"address"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"_offerId","internalType":"uint256","type":"uint256"}],"name":"calculateRepaymentAmount","outputs":[{"name":"totalAmount","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"_offerId","internalType":"uint256","type":"uint256"}],"name":"cancelOffer","outputs":[],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"_offerId","internalType":"uint256","type":"uint256"}],"name":"claimCollateral","outputs":[],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"_lendToken","internalType":"address","type":"address"},{"name":"_lendAmount","internalType":"uint256","type":"uint256"},{"name":"_collateralToken","internalType":"address","type":"address"},{"name":"_collateralAmount","internalType":"uint256","type":"uint256"},{"name":"_duration","internalType":"uint256","type":"uint256"},{"name":"_lenderChainId","internalType":"uint256","type":"uint256"},{"name":"_lenderRefundAddress","internalType":"address","type":"address"},{"name":"_lenderFee","internalType":"uint256","type":"uint256"}],"name":"createOffer","outputs":[{"name":"offerId","internalType":"uint256","type":"uint256"}],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"_user","internalType":"address","type":"address"}],"name":"getBorrowerOffers","outputs":[{"name":"","internalType":"struct RepoContract.RepoOffer[]","type":"tuple[]","components":[{"name":"offerId","internalType":"uint256","type":"uint256"},{"name":"lender","internalType":"address","type":"address"},{"name":"borrower","internalType":"address","type":"address"},{"name":"lenderRefundAddress","internalType":"address","type":"address"},{"name":"borrowerRefundAddress","internalType":"address","type":"address"},{"name":"lenderChainId","internalType":"uint256","type":"uint256"},{"name":"borrowerChainId","internalType":"uint256","type":"uint256"},{"name":"lendToken","internalType":"address","type":"address"},{"name":"lendAmount","internalType":"uint256","type":"uint256"},{"name":"collateralToken","internalType":"address","type":"address"},{"name":"collateralAmount","internalType":"uint256","type":"uint256"},{"name":"duration","internalType":"uint256","type":"uint256"},{"name":"startTime","internalType":"uint256","type":"uint256"},{"name":"endTime","internalType":"uint256","type":"uint256"},{"name":"lenderFee","internalType":"uint256","type":"uint256"},{"name":"status","internalType":"enum RepoContract.OfferStatus","type":"uint8"}]}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"_user","internalType":"address","type":"address"}],"name":"getLenderOffers","outputs":[{"name":"","internalType":"struct RepoContract.RepoOffer[]","type":"tuple[]","components":[{"name":"offerId","internalType":"uint256","type":"uint256"},{"name":"lender","internalType":"address","type":"address"},{"name":"borrower","internalType":"address","type":"address"},{"name":"lenderRefundAddress","internalType":"address","type":"address"},{"name":"borrowerRefundAddress","internalType":"address","type":"address"},{"name":"lenderChainId","internalType":"uint256","type":"uint256"},{"name":"borrowerChainId","internalType":"uint256","type":"uint256"},{"name":"lendToken","internalType":"address","type":"address"},{"name":"lendAmount","internalType":"uint256","type":"uint256"},{"name":"collateralToken","internalType":"address","type":"address"},{"name":"collateralAmount","internalType":"uint256","type":"uint256"},{"name":"duration","internalType":"uint256","type":"uint256"},{"name":"startTime","internalType":"uint256","type":"uint256"},{"name":"endTime","internalType":"uint256","type":"uint256"},{"name":"lenderFee","internalType":"uint256","type":"uint256"},{"name":"status","internalType":"enum RepoContract.OfferStatus","type":"uint8"}]}],"stateMutability":"view"},{"type":"function","inputs":[],"name":"getOpenOffers","outputs":[{"name":"","internalType":"struct RepoContract.RepoOffer[]","type":"tuple[]","components":[{"name":"offerId","internalType":"uint256","type":"uint256"},{"name":"lender","internalType":"address","type":"address"},{"name":"borrower","internalType":"address","type":"address"},{"name":"lenderRefundAddress","internalType":"address","type":"address"},{"name":"borrowerRefundAddress","internalType":"address","type":"address"},{"name":"lenderChainId","internalType":"uint256","type":"uint256"},{"name":"borrowerChainId","internalType":"uint256","type":"uint256"},{"name":"lendToken","internalType":"address","type":"address"},{"name":"lendAmount","internalType":"uint256","type":"uint256"},{"name":"collateralToken","internalType":"address","type":"address"},{"name":"collateralAmount","internalType":"uint256","type":"uint256"},{"name":"duration","internalType":"uint256","type":"uint256"},{"name":"startTime","internalType":"uint256","type":"uint256"},{"name":"endTime","internalType":"uint256","type":"uint256"},{"name":"lenderFee","internalType":"uint256","type":"uint256"},{"name":"status","internalType":"enum RepoContract.OfferStatus","type":"uint8"}]}],"stateMutability":"view"},{"type":"function","inputs":[],"name":"gracePeriod","outputs":[{"name":"","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"function","inputs":[],"name":"offerCounter","outputs":[{"name":"","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"","internalType":"uint256","type":"uint256"}],"name":"offers","outputs":[{"name":"offerId","internalType":"uint256","type":"uint256"},{"name":"lender","internalType":"address","type":"address"},{"name":"borrower","internalType":"address","type":"address"},{"name":"lenderRefundAddress","internalType":"address","type":"address"},{"name":"borrowerRefundAddress","internalType":"address","type":"address"},{"name":"lenderChainId","internalType":"uint256","type":"uint256"},{"name":"borrowerChainId","internalType":"uint256","type":"uint256"},{"name":"lendToken","internalType":"address","type":"address"},{"name":"lendAmount","internalType":"uint256","type":"uint256"},{"name":"collateralToken","internalType":"address","type":"address"},{"name":"collateralAmount","internalType":"uint256","type":"uint256"},{"name":"duration","internalType":"uint256","type":"uint256"},{"name":"startTime","internalType":"uint256","type":"uint256"},{"name":"endTime","internalType":"uint256","type":"uint256"},{"name":"lenderFee","internalType":"uint256","type":"uint256"},{"name":"status","internalType":"enum RepoContract.OfferStatus","type":"uint8"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"_offerId","internalType":"uint256","type":"uint256"}],"name":"repayLoan","outputs":[],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"_newAdmin","internalType":"address","type":"address"}],"name":"setAdmin","outputs":[],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"_gracePeriod","internalType":"uint256","type":"uint256"}],"name":"setGracePeriod","outputs":[],"stateMutability":"nonpayable"},{"type":"function","inputs":[{"name":"_unbundlerAddress","internalType":"address","type":"address"}],"name":"setUnbundlerAddress","outputs":[],"stateMutability":"nonpayable"},{"type":"function","inputs":[],"name":"unbundlerAddress","outputs":[{"name":"","internalType":"address","type":"address"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"","internalType":"address","type":"address"},{"name":"","internalType":"uint256","type":"uint256"}],"name":"userBorrowerOffers","outputs":[{"name":"","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"function","inputs":[{"name":"","internalType":"address","type":"address"},{"name":"","internalType":"uint256","type":"uint256"}],"name":"userLenderOffers","outputs":[{"name":"","internalType":"uint256","type":"uint256"}],"stateMutability":"view"},{"type":"event","anonymous":false,"inputs":[{"name":"oldAdmin","internalType":"address","type":"address","indexed":true},{"name":"newAdmin","internalType":"address","type":"address","indexed":true}],"name":"AdminChanged"},{"type":"event","anonymous":false,"inputs":[{"name":"offerId","internalType":"uint256","type":"uint256","indexed":true}],"name":"CollateralClaimed"},{"type":"event","anonymous":false,"inputs":[{"name":"offerId","internalType":"uint256","type":"uint256","indexed":true}],"name":"CollateralReleased"},{"type":"event","anonymous":false,"inputs":[{"name":"token","internalType":"address","type":"address","indexed":false},{"name":"amount","internalType":"uint256","type":"uint256","indexed":false},{"name":"recipient","internalType":"address","type":"address","indexed":false},{"name":"chainId","internalType":"uint256","type":"uint256","indexed":false}],"name":"CrossChainTransferInitiated"},{"type":"event","anonymous":false,"inputs":[{"name":"newGracePeriod","internalType":"uint256","type":"uint256","indexed":false}],"name":"GracePeriodUpdated"},{"type":"event","anonymous":false,"inputs":[{"name":"offerId","internalType":"uint256","type":"uint256","indexed":true}],"name":"LoanRepaid"},{"type":"event","anonymous":false,"inputs":[{"name":"offerId","internalType":"uint256","type":"uint256","indexed":true},{"name":"borrower","internalType":"address","type":"address","indexed":true},{"name":"borrowerChainId","internalType":"uint256","type":"uint256","indexed":false}],"name":"OfferAccepted"},{"type":"event","anonymous":false,"inputs":[{"name":"offerId","internalType":"uint256","type":"uint256","indexed":true}],"name":"OfferCancelled"},{"type":"event","anonymous":false,"inputs":[{"name":"offerId","internalType":"uint256","type":"uint256","indexed":true},{"name":"lender","internalType":"address","type":"address","indexed":true},{"name":"lenderChainId","internalType":"uint256","type":"uint256","indexed":false}],"name":"OfferCreated"},{"type":"event","anonymous":false,"inputs":[{"name":"newUnbundlerAddress","internalType":"address","type":"address","indexed":false}],"name":"UnbundlerAddressUpdated"},{"type":"error","inputs":[],"name":"AmountMustBeGreaterThanZero"},{"type":"error","inputs":[],"name":"ZeroAddress"}]',
    'Intraday Repo',
    NULL,
    false,
    false,
    NULL
)
ON CONFLICT (contract_address) DO NOTHING;

-- Native Token Vault contract (L2_NATIVE_TOKEN_VAULT_ADDRESS)
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('0000000000000000000000000000000000010004', 'hex'),
    '[{"type":"function","name":"assetId","inputs":[{"name":"token","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"bridgedTokens","inputs":[{"name":"index","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"bridgedTokensCount","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"ensureTokenIsRegistered","inputs":[{"name":"_nativeToken","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"nonpayable"},{"type":"function","name":"getERC20Getters","inputs":[{"name":"_token","type":"address","internalType":"address"},{"name":"_originChainId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"bytes","internalType":"bytes"}],"stateMutability":"view"},{"type":"function","name":"originChainId","inputs":[{"name":"assetId","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"originToken","inputs":[{"name":"assetId","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"registerToken","inputs":[{"name":"_l1Token","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"tokenAddress","inputs":[{"name":"assetId","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"tryRegisterTokenFromBurnData","inputs":[{"name":"_burnData","type":"bytes","internalType":"bytes"},{"name":"_expectedAssetId","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"event","name":"BridgedTokenBeaconUpdated","inputs":[{"name":"bridgedTokenBeacon","type":"address","indexed":false,"internalType":"address"},{"name":"bridgedTokenProxyBytecodeHash","type":"bytes32","indexed":false,"internalType":"bytes32"}],"anonymous":false}]',
    'Native Token Vault',
    NULL,
    false,
    false,
    NULL
)
ON CONFLICT (contract_address) DO NOTHING;

-- InteropCenter contract (L2_INTEROP_CENTER_ADDRESS)
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('0000000000000000000000000000000000010010', 'hex'),
    '[{"type":"function","name":"forwardTransactionOnGatewayWithBalanceChange","inputs":[{"name":"_chainId","type":"uint256","internalType":"uint256"},{"name":"_canonicalTxHash","type":"bytes32","internalType":"bytes32"},{"name":"_expirationTimestamp","type":"uint64","internalType":"uint64"},{"name":"_balanceChange","type":"tuple","internalType":"struct BalanceChange","components":[{"name":"version","type":"bytes1","internalType":"bytes1"},{"name":"originToken","type":"address","internalType":"address"},{"name":"baseTokenAssetId","type":"bytes32","internalType":"bytes32"},{"name":"baseTokenAmount","type":"uint256","internalType":"uint256"},{"name":"assetId","type":"bytes32","internalType":"bytes32"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"tokenOriginChainId","type":"uint256","internalType":"uint256"}]}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"initL2","inputs":[{"name":"_l1ChainId","type":"uint256","internalType":"uint256"},{"name":"_owner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"sendBundle","inputs":[{"name":"_destinationChainId","type":"bytes","internalType":"bytes"},{"name":"_callStarters","type":"tuple[]","internalType":"struct InteropCallStarter[]","components":[{"name":"to","type":"bytes","internalType":"bytes"},{"name":"data","type":"bytes","internalType":"bytes"},{"name":"callAttributes","type":"bytes[]","internalType":"bytes[]"}]},{"name":"_bundleAttributes","type":"bytes[]","internalType":"bytes[]"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"payable"},{"type":"event","name":"InteropBundleSent","inputs":[{"name":"l2l1MsgHash","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"interopBundleHash","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"interopBundle","type":"tuple","indexed":false,"internalType":"struct InteropBundle","components":[{"name":"version","type":"bytes1","internalType":"bytes1"},{"name":"sourceChainId","type":"uint256","internalType":"uint256"},{"name":"destinationChainId","type":"uint256","internalType":"uint256"},{"name":"interopBundleSalt","type":"bytes32","internalType":"bytes32"},{"name":"calls","type":"tuple[]","internalType":"struct InteropCall[]","components":[{"name":"version","type":"bytes1","internalType":"bytes1"},{"name":"shadowAccount","type":"bool","internalType":"bool"},{"name":"to","type":"address","internalType":"address"},{"name":"from","type":"address","internalType":"address"},{"name":"value","type":"uint256","internalType":"uint256"},{"name":"data","type":"bytes","internalType":"bytes"}]},{"name":"bundleAttributes","type":"tuple","internalType":"struct BundleAttributes","components":[{"name":"executionAddress","type":"bytes","internalType":"bytes"},{"name":"unbundlerAddress","type":"bytes","internalType":"bytes"}]}]}],"anonymous":false},{"type":"event","name":"NewAssetRouter","inputs":[{"name":"oldAssetRouter","type":"address","indexed":true,"internalType":"address"},{"name":"newAssetRouter","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"NewAssetTracker","inputs":[{"name":"oldAssetTracker","type":"address","indexed":true,"internalType":"address"},{"name":"newAssetTracker","type":"address","indexed":true,"internalType":"address"}],"anonymous":false}]',
    'InteropCenter',
    NULL,
    false,
    false,
    NULL
)
ON CONFLICT (contract_address) DO NOTHING;

-- InteropHandler contract (L2_INTEROP_HANDLER_ADDRESS)
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('000000000000000000000000000000000001000d', 'hex'),
    '[{"type":"function","name":"executeBundle","inputs":[{"name":"_bundle","type":"bytes","internalType":"bytes"},{"name":"_proof","type":"tuple","internalType":"struct MessageInclusionProof","components":[{"name":"chainId","type":"uint256","internalType":"uint256"},{"name":"l1BatchNumber","type":"uint256","internalType":"uint256"},{"name":"l2MessageIndex","type":"uint256","internalType":"uint256"},{"name":"message","type":"tuple","internalType":"struct L2Message","components":[{"name":"txNumberInBatch","type":"uint16","internalType":"uint16"},{"name":"sender","type":"address","internalType":"address"},{"name":"data","type":"bytes","internalType":"bytes"}]},{"name":"proof","type":"bytes32[]","internalType":"bytes32[]"}]}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"getShadowAccountAddress","inputs":[{"name":"_ownerChainId","type":"uint256","internalType":"uint256"},{"name":"_ownerAddress","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"getShadowAccountAddress","inputs":[{"name":"_ownerAddress","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"unbundleBundle","inputs":[{"name":"_sourceChainId","type":"uint256","internalType":"uint256"},{"name":"_bundle","type":"bytes","internalType":"bytes"},{"name":"_callStatus","type":"uint8[]","internalType":"enum CallStatus[]"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"verifyBundle","inputs":[{"name":"_bundle","type":"bytes","internalType":"bytes"},{"name":"_proof","type":"tuple","internalType":"struct MessageInclusionProof","components":[{"name":"chainId","type":"uint256","internalType":"uint256"},{"name":"l1BatchNumber","type":"uint256","internalType":"uint256"},{"name":"l2MessageIndex","type":"uint256","internalType":"uint256"},{"name":"message","type":"tuple","internalType":"struct L2Message","components":[{"name":"txNumberInBatch","type":"uint16","internalType":"uint16"},{"name":"sender","type":"address","internalType":"address"},{"name":"data","type":"bytes","internalType":"bytes"}]},{"name":"proof","type":"bytes32[]","internalType":"bytes32[]"}]}],"outputs":[],"stateMutability":"nonpayable"},{"type":"event","name":"BundleExecuted","inputs":[{"name":"bundleHash","type":"bytes32","indexed":true,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"BundleUnbundled","inputs":[{"name":"bundleHash","type":"bytes32","indexed":true,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"BundleVerified","inputs":[{"name":"bundleHash","type":"bytes32","indexed":true,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"CallProcessed","inputs":[{"name":"bundleHash","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"callIndex","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"status","type":"uint8","indexed":false,"internalType":"enum CallStatus"}],"anonymous":false},{"type":"event","name":"ShadowAccountDeployed","inputs":[{"name":"shadowAccount","type":"address","indexed":true,"internalType":"address"},{"name":"ownerChainId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"ownerAddress","type":"address","indexed":true,"internalType":"address"}],"anonymous":false}]',
    'InteropHandler',
    NULL,
    false,
    false,
    NULL
)
ON CONFLICT (contract_address) DO NOTHING;

-- L2 Asset Router contract (L2_ASSET_ROUTER_ADDRESS)
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('0000000000000000000000000000000000010003', 'hex'),
    '[{"type":"function","name":"BASE_TOKEN_ASSET_ID","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"L1_ASSET_ROUTER","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IL1AssetRouter"}],"stateMutability":"view"},{"type":"function","name":"assetHandlerAddress","inputs":[{"name":"_assetId","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"finalizeDepositLegacyBridge","inputs":[{"name":"_l1Sender","type":"address","internalType":"address"},{"name":"_l2Receiver","type":"address","internalType":"address"},{"name":"_l1Token","type":"address","internalType":"address"},{"name":"_amount","type":"uint256","internalType":"uint256"},{"name":"_data","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"initiateIndirectCall","inputs":[{"name":"_chainId","type":"uint256","internalType":"uint256"},{"name":"_originalCaller","type":"address","internalType":"address"},{"name":"_value","type":"uint256","internalType":"uint256"},{"name":"_data","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"interopCallStarter","type":"tuple","internalType":"struct InteropCallStarter","components":[{"name":"to","type":"bytes","internalType":"bytes"},{"name":"data","type":"bytes","internalType":"bytes"},{"name":"callAttributes","type":"bytes[]","internalType":"bytes[]"}]}],"stateMutability":"payable"},{"type":"function","name":"setAssetHandlerAddress","inputs":[{"name":"_originChainId","type":"uint256","internalType":"uint256"},{"name":"_assetId","type":"bytes32","internalType":"bytes32"},{"name":"_assetHandlerAddress","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setLegacyTokenAssetHandler","inputs":[{"name":"_assetId","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"withdraw","inputs":[{"name":"_assetId","type":"bytes32","internalType":"bytes32"},{"name":"_transferData","type":"bytes","internalType":"bytes"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"nonpayable"},{"type":"function","name":"withdrawLegacyBridge","inputs":[{"name":"_l1Receiver","type":"address","internalType":"address"},{"name":"_l2Token","type":"address","internalType":"address"},{"name":"_amount","type":"uint256","internalType":"uint256"},{"name":"_sender","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"event","name":"AssetDeploymentTrackerRegistered","inputs":[{"name":"assetId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"additionalData","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"assetDeploymentTracker","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"AssetHandlerRegistered","inputs":[{"name":"assetId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"_assetHandlerAddress","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"BridgehubDepositBaseTokenInitiated","inputs":[{"name":"chainId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"from","type":"address","indexed":true,"internalType":"address"},{"name":"assetId","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"BridgehubDepositInitiated","inputs":[{"name":"chainId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"txDataHash","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"from","type":"address","indexed":true,"internalType":"address"},{"name":"assetId","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"bridgeMintCalldata","type":"bytes","indexed":false,"internalType":"bytes"}],"anonymous":false},{"type":"event","name":"BridgehubWithdrawalInitiated","inputs":[{"name":"chainId","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"sender","type":"address","indexed":true,"internalType":"address"},{"name":"assetId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"assetDataHash","type":"bytes32","indexed":false,"internalType":"bytes32"}],"anonymous":false},{"type":"event","name":"DepositFinalizedAssetRouter","inputs":[{"name":"chainId","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"assetId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"assetData","type":"bytes","indexed":false,"internalType":"bytes"}],"anonymous":false},{"type":"event","name":"WithdrawalInitiatedAssetRouter","inputs":[{"name":"chainId","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"l2Sender","type":"address","indexed":true,"internalType":"address"},{"name":"assetId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"assetData","type":"bytes","indexed":false,"internalType":"bytes"}],"anonymous":false}]',
    'L2 Asset Router',
    NULL,
    false,
    false,
    NULL
)
ON CONFLICT (contract_address) DO NOTHING;

-- InteropRootStorage contract (L2_INTEROP_ROOT_STORAGE_ADDRESS)
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('0000000000000000000000000000000000010005', 'hex'),
    '[{"type":"function","name":"interopRoots","inputs":[{"name":"chainId","type":"uint256","internalType":"uint256"},{"name":"batchNumber","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"}]',
    'InteropRootStorage',
    NULL,
    false,
    false,
    NULL
)
ON CONFLICT (contract_address) DO NOTHING;

-- ============================================================================
-- 3. Contract Template Permissions (ERC-20 function permissions)
-- ============================================================================
INSERT INTO contract_template_permissions (id, template_id, method_selector, access_type, function_signature, rule_type)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, decode('dd62ed3e', 'hex'), 'read', 'function allowance(address owner, address spender) view returns (uint256)', 'restrictArgument'),
    (2, 1, decode('095ea7b3', 'hex'), 'write', 'function approve(address spender, uint256 value) returns (bool)', 'public'),
    (3, 1, decode('70a08231', 'hex'), 'read', 'function balanceOf(address account) view returns (uint256)', 'restrictArgument'),
    (4, 1, decode('313ce567', 'hex'), 'read', 'function decimals() view returns (uint8)', 'public'),
    (5, 1, decode('40c10f19', 'hex'), 'write', 'function mint(address _to, uint256 _amount) returns (bool)', 'restrictArgument'),
    (6, 1, decode('06fdde03', 'hex'), 'read', 'function name() view returns (string)', 'public'),
    (7, 1, decode('95d89b41', 'hex'), 'read', 'function symbol() view returns (string)', 'public'),
    (8, 1, decode('18160ddd', 'hex'), 'read', 'function totalSupply() view returns (uint256)', 'public'),
    (9, 1, decode('a9059cbb', 'hex'), 'write', 'function transfer(address to, uint256 value) returns (bool)', 'public'),
    (10, 1, decode('23b872dd', 'hex'), 'write', 'function transferFrom(address from, address to, uint256 value) returns (bool)', 'restrictArgument')
ON CONFLICT (template_id, method_selector) DO NOTHING;

-- Reset sequence for contract_template_permissions
SELECT setval('contract_template_permissions_id_seq', COALESCE((SELECT MAX(id) FROM contract_template_permissions), 0) + 1, false);

-- ============================================================================
-- 4. Contract Template Argument Restrictions
-- ============================================================================
INSERT INTO contract_template_argument_restrictions (id, permission_id, argument_index)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 0),  -- allowance: restrict first argument (owner)
    (2, 3, 0),  -- balanceOf: restrict first argument (account)
    (3, 5, 0),  -- mint: restrict first argument (_to)
    (4, 10, 0)  -- transferFrom: restrict first argument (from)
ON CONFLICT (permission_id, argument_index) DO NOTHING;

-- Reset sequence for contract_template_argument_restrictions
SELECT setval('contract_template_argument_restrictions_id_seq', COALESCE((SELECT MAX(id) FROM contract_template_argument_restrictions), 0) + 1, false);

-- ============================================================================
-- 5. Contract Function Permissions (Repo contract functions)
-- ============================================================================
INSERT INTO contract_function_permissions (id, contract_address, method_selector, function_signature, rule_type, access_type)
OVERRIDING SYSTEM VALUE
VALUES
    (1, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('07ae6a5d', 'hex'), 'function acceptOffer(uint256 _offerId, uint256 _borrowerChainId, address _borrowerRefundAddress)', 'public', 'write'),
    (2, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('f851a440', 'hex'), 'function admin() view returns (address)', 'public', 'read'),
    (3, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('b1197239', 'hex'), 'function calculateRepaymentAmount(uint256 _offerId) view returns (uint256 totalAmount)', 'public', 'read'),
    (4, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('ef706adf', 'hex'), 'function cancelOffer(uint256 _offerId)', 'public', 'write'),
    (5, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('c49785b4', 'hex'), 'function claimCollateral(uint256 _offerId)', 'public', 'write'),
    (6, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('0e2e7766', 'hex'), 'function createOffer(address _lendToken, uint256 _lendAmount, address _collateralToken, uint256 _collateralAmount, uint256 _duration, uint256 _lenderChainId, address _lenderRefundAddress, uint256 _lenderFee) returns (uint256 offerId)', 'public', 'write'),
    (7, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('c6985330', 'hex'), 'function getBorrowerOffers(address _user) view returns ((uint256 offerId, address lender, address borrower, address lenderRefundAddress, address borrowerRefundAddress, uint256 lenderChainId, uint256 borrowerChainId, address lendToken, uint256 lendAmount, address collateralToken, uint256 collateralAmount, uint256 duration, uint256 startTime, uint256 endTime, uint256 lenderFee, uint8 status)[])', 'public', 'read'),
    (8, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('c9fdfcce', 'hex'), 'function getLenderOffers(address _user) view returns ((uint256 offerId, address lender, address borrower, address lenderRefundAddress, address borrowerRefundAddress, uint256 lenderChainId, uint256 borrowerChainId, address lendToken, uint256 lendAmount, address collateralToken, uint256 collateralAmount, uint256 duration, uint256 startTime, uint256 endTime, uint256 lenderFee, uint8 status)[])', 'public', 'read'),
    (9, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('d2024b1e', 'hex'), 'function getOpenOffers() view returns ((uint256 offerId, address lender, address borrower, address lenderRefundAddress, address borrowerRefundAddress, uint256 lenderChainId, uint256 borrowerChainId, address lendToken, uint256 lendAmount, address collateralToken, uint256 collateralAmount, uint256 duration, uint256 startTime, uint256 endTime, uint256 lenderFee, uint8 status)[])', 'public', 'read'),
    (10, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('a06db7dc', 'hex'), 'function gracePeriod() view returns (uint256)', 'public', 'read'),
    (11, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('b7a3c1da', 'hex'), 'function offerCounter() view returns (uint256)', 'public', 'read'),
    (12, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('8a72ea6a', 'hex'), 'function offers(uint256) view returns (uint256 offerId, address lender, address borrower, address lenderRefundAddress, address borrowerRefundAddress, uint256 lenderChainId, uint256 borrowerChainId, address lendToken, uint256 lendAmount, address collateralToken, uint256 collateralAmount, uint256 duration, uint256 startTime, uint256 endTime, uint256 lenderFee, uint8 status)', 'public', 'read'),
    (13, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('ab7b1c89', 'hex'), 'function repayLoan(uint256 _offerId)', 'public', 'write'),
    (14, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('704b6c02', 'hex'), 'function setAdmin(address _newAdmin)', 'public', 'write'),
    (15, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('f2f65960', 'hex'), 'function setGracePeriod(uint256 _gracePeriod)', 'public', 'write'),
    (16, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('16bfb10e', 'hex'), 'function setUnbundlerAddress(address _unbundlerAddress)', 'public', 'write'),
    (17, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('1cb3b6be', 'hex'), 'function unbundlerAddress() view returns (address)', 'public', 'read'),
    (18, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('7ffb21b6', 'hex'), 'function userBorrowerOffers(address, uint256) view returns (uint256)', 'public', 'read'),
    (19, decode('5fbdb2315678afecb367f032d93f642f64180aa3', 'hex'), decode('e16abc26', 'hex'), 'function userLenderOffers(address, uint256) view returns (uint256)', 'public', 'read'),
    -- Native Token Vault functions (public read)
    (20, decode('0000000000000000000000000000000000010004', 'hex'), decode('97bb3ce9', 'hex'), 'function tokenAddress(bytes32 assetId) view returns (address)', 'public', 'read'),
    (21, decode('0000000000000000000000000000000000010004', 'hex'), decode('fd3f60df', 'hex'), 'function assetId(address token) view returns (bytes32)', 'public', 'read'),
    -- InteropCenter functions (public write for sendBundle)
    (22, decode('0000000000000000000000000000000000010010', 'hex'), decode('5ef7e104', 'hex'), 'function sendBundle(bytes _destinationChainId, (bytes to, bytes data, bytes[] callAttributes)[] _callStarters, bytes[] _bundleAttributes) payable returns (bytes32)', 'public', 'write'),
    -- InteropHandler functions (public read for getShadowAccountAddress)
    (23, decode('000000000000000000000000000000000001000d', 'hex'), decode('30fe761e', 'hex'), 'function getShadowAccountAddress(uint256 _ownerChainId, address _ownerAddress) view returns (address)', 'public', 'read'),
    (24, decode('000000000000000000000000000000000001000d', 'hex'), decode('ae7be143', 'hex'), 'function getShadowAccountAddress(address _ownerAddress) view returns (address)', 'public', 'read'),
    -- L2 Asset Router functions (public for bridging)
    (25, decode('0000000000000000000000000000000000010003', 'hex'), decode('4a2e35ba', 'hex'), 'function withdraw(bytes32 _assetId, bytes _transferData) returns (bytes32)', 'public', 'write'),
    (26, decode('0000000000000000000000000000000000010003', 'hex'), decode('4d7e3d62', 'hex'), 'function initiateIndirectCall(uint256 _chainId, address _originalCaller, uint256 _value, bytes _data) payable returns ((bytes to, bytes data, bytes[] callAttributes) interopCallStarter)', 'public', 'write'),
    (27, decode('0000000000000000000000000000000000010003', 'hex'), decode('cb944dec', 'hex'), 'function BASE_TOKEN_ASSET_ID() view returns (bytes32)', 'public', 'read'),
    (28, decode('0000000000000000000000000000000000010003', 'hex'), decode('53b9e632', 'hex'), 'function assetHandlerAddress(bytes32 _assetId) view returns (address)', 'public', 'read'),
    -- InteropHandler bundleStatus function (for checking bundle execution status)
    (29, decode('000000000000000000000000000000000001000d', 'hex'), decode('7e4fbbde', 'hex'), 'function bundleStatus(bytes32 bundleHash) view returns (uint8)', 'public', 'read'),
    -- InteropRootStorage interopRoots function (for checking root availability)
    (30, decode('0000000000000000000000000000000000010005', 'hex'), decode('77cfd171', 'hex'), 'function interopRoots(uint256 chainId, uint256 batchNumber) view returns (bytes32)', 'public', 'read')
ON CONFLICT (contract_address, method_selector) DO NOTHING;

-- Reset sequence for contract_function_permissions
SELECT setval('contract_permissions_id_seq', COALESCE((SELECT MAX(id) FROM contract_function_permissions), 0) + 1, false);

-- ============================================================================
-- 6. Applications (OAuth clients)
-- ============================================================================
INSERT INTO applications (id, oauth_client_id, oauth_redirect_uris, name, origin)
VALUES (
    '7Zac5yyApwCYdGDH20NSf',
    'IjRacE3lJ8vF85jJ',
    ARRAY['http://localhost:3004/auth/callback?chainId=6565'],
    'Intraday Repo',
    'http://localhost:3004'
)
ON CONFLICT (oauth_client_id) DO NOTHING;

-- ============================================================================
-- 7. Roles
-- ============================================================================
INSERT INTO roles (role_name, system_permissions, is_system_role)
VALUES ('admin', '{contract_deployment,full_sequencer_rpc_access,full_read_access}', true)
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================================
-- 8. Users (OIDC users)
-- ============================================================================
-- Admin user
INSERT INTO users (id, display_name, oidc_sub, source)
VALUES (
    'v3rW8Y-bBmTypyI448Q6A',
    'admin@local.dev',
    '00000000-0000-0000-0000-000000000001',
    'oidc'
)
ON CONFLICT (id) DO NOTHING;

-- Demo User 1 (Lender)
INSERT INTO users (id, display_name, oidc_sub, source)
VALUES (
    'u1Xe7K-cDnUzqyJ559R7B',
    'user1@local.dev',
    '00000000-0000-0000-0000-000000000002',
    'oidc'
)
ON CONFLICT (id) DO NOTHING;

-- Demo User 2 (Borrower)
INSERT INTO users (id, display_name, oidc_sub, source)
VALUES (
    'u2Yf8L-dEoVarxK660S8C',
    'user2@local.dev',
    '00000000-0000-0000-0000-000000000003',
    'oidc'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. User Roles
-- ============================================================================
-- Only admin user gets admin role
INSERT INTO user_roles (user_id, role_name)
VALUES ('v3rW8Y-bBmTypyI448Q6A', 'admin')
ON CONFLICT (user_id, role_name) DO NOTHING;

-- ============================================================================
-- 10. User Wallets
-- ============================================================================
-- Admin wallet (Anvil default account #0)
INSERT INTO user_wallets (wallet_address, user_id)
VALUES (decode('f39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'hex'), 'v3rW8Y-bBmTypyI448Q6A')
ON CONFLICT (wallet_address) DO NOTHING;

-- User 1 wallet (Lender)
INSERT INTO user_wallets (wallet_address, user_id)
VALUES (decode('AD350E768913dAc29b8113C571fB3321c9d01495', 'hex'), 'u1Xe7K-cDnUzqyJ559R7B')
ON CONFLICT (wallet_address) DO NOTHING;

-- User 2 wallet (Borrower)
INSERT INTO user_wallets (wallet_address, user_id)
VALUES (decode('cFB389324aCf2e0Aad3aC5073166fe428f57fA89', 'hex'), 'u2Yf8L-dEoVarxK660S8C')
ON CONFLICT (wallet_address) DO NOTHING;
