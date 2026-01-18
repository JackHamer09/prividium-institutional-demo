-- Seed script for permissions_api_l2b database
-- Seeds contract templates, contracts (ERC-20 only, no Repo), permissions, and user wallet data
-- Run with: docker exec -i zksync-prividium-institutional-demo-postgres-1 psql -U postgres -d permissions_api_l2b < prividium-utils/dev/seed-permissions-l2b.sql

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
-- 2. Contracts (ERC-20 tokens only, no Repo contract)
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

-- TTBILL token
INSERT INTO contracts (contract_address, abi, name, description, disclose_erc_20_balance, disclose_bytecode, template_id)
VALUES (
    decode('9fe46736679d2d9a65f0992f2272de9f3c7fa6e0', 'hex'),
    '[]',
    'TTBILL',
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
-- 5. Applications (OAuth clients)
-- ============================================================================
INSERT INTO applications (id, oauth_client_id, oauth_redirect_uris, name, origin)
VALUES (
    '7Zac5yyApwCYdGDH20NSf',
    'IjRacE3lJ8vF85jJ',
    ARRAY['http://localhost:3004/auth/callback?chainId=6566'],
    'Intraday Repo',
    'http://localhost:3004'
)
ON CONFLICT (oauth_client_id) DO NOTHING;

-- ============================================================================
-- 6. Roles
-- ============================================================================
INSERT INTO roles (role_name, system_permissions, is_system_role)
VALUES ('admin', '{contract_deployment,full_sequencer_rpc_access,full_read_access}', true)
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================================
-- 7. Users (OIDC admin user)
-- ============================================================================
INSERT INTO users (id, display_name, oidc_sub, source)
VALUES (
    'v3rW8Y-bBmTypyI448Q6A',
    'admin@local.dev',
    '00000000-0000-0000-0000-000000000001',
    'oidc'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. User Roles
-- ============================================================================
INSERT INTO user_roles (user_id, role_name)
VALUES ('v3rW8Y-bBmTypyI448Q6A', 'admin')
ON CONFLICT (user_id, role_name) DO NOTHING;

-- ============================================================================
-- 9. User Wallets
-- Address derived from e2e test mnemonic: 'test test test test test test test test test test test junk'
-- ============================================================================
INSERT INTO user_wallets (wallet_address, user_id)
VALUES (decode('f39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'hex'), 'v3rW8Y-bBmTypyI448Q6A')
ON CONFLICT (wallet_address) DO NOTHING;
