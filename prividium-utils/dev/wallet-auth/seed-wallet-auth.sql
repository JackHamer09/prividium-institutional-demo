-- Seed script for wallet-auth database
-- Creates test users matching Keycloak realm-export.json configuration

-- Insert roles if they don't exist
INSERT INTO roles (role_name, system_permissions, is_system_role)
VALUES
    ('admin', '{contract_deployment,full_sequencer_rpc_access,full_read_access}', true),
    ('user', '{}', false)
ON CONFLICT (role_name) DO NOTHING;

-- Insert users
INSERT INTO users (id, display_name, source)
VALUES
    -- Admin user
    (
        'usr_admin_test_00001',
        'Admin User',
        'crypto_native'
    ),
    -- Regular user
    (
        'usr_regular_test_0002',
        'Regular User',
        'crypto_native'
    ),
    -- Test user
    (
        'usr_test_test_000003',
        'Test User',
        'crypto_native'
    )
ON CONFLICT (id) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_name)
VALUES
    ('usr_admin_test_00001', 'admin'),
    ('usr_regular_test_0002', 'user'),
    ('usr_test_test_000003', 'user')
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Associate wallet addresses with users
-- Addresses derived from e2e test mnemonic: 'test test test test test test test test test test test junk'
INSERT INTO user_wallets (wallet_address, user_id)
VALUES
    (decode('f39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'hex'), 'usr_admin_test_00001'),
    (decode('70997970C51812dc3A010C7d01b50e0d17dc79C8', 'hex'), 'usr_regular_test_0002'),
    (decode('3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 'hex'), 'usr_test_test_000003')
ON CONFLICT (wallet_address) DO NOTHING;
