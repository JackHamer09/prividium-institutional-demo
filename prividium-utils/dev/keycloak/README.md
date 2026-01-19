# Local Keycloak OIDC Provider

This directory contains the configuration for a local Keycloak instance used for development and E2E testing.

## Overview

Keycloak is an open-source identity and access management solution that provides OIDC/OAuth 2.0 authentication. This
local instance replaces the need for external Okta credentials during local development and automated testing.

## Access

- **URL**: http://localhost:5080
- **Admin Console**: http://localhost:5080/admin
- **Admin Credentials**:
  - Username: `admin`
  - Password: `admin`

## Realm Configuration

- **Realm Name**: `prividium`
- **Client ID**: `prividium-client`
- **OIDC Endpoints**:
  - Authorization: http://localhost:5080/realms/prividium/protocol/openid-connect/auth
  - Token: http://localhost:5080/realms/prividium/protocol/openid-connect/token
  - JWKS: http://localhost:5080/realms/prividium/protocol/openid-connect/certs
  - UserInfo: http://localhost:5080/realms/prividium/protocol/openid-connect/userinfo

## Test Users

All test users have the password: `password`

**Note**: Each user has a fixed UUID configured in `realm-export.json`. These UUIDs are used as the `sub` claim in JWTs
and are immutable, providing secure user identification.

| Email           | UUID (sub claim)                     | Role        | Purpose                |
| --------------- | ------------------------------------ | ----------- | ---------------------- |
| admin@local.dev | 00000000-0000-0000-0000-000000000001 | admin, user | Administrative testing |
| user@local.dev  | 00000000-0000-0000-0000-000000000002 | user        | Regular user testing   |
| test@local.dev  | 00000000-0000-0000-0000-000000000003 | user        | E2E test automation    |

The `admin@local.dev` user is automatically granted admin privileges in the Permissions API when their UUID is listed in
the `OIDC_ADMIN_SUBS` environment variable (see `apps/permissions-api/.env.example`).

## Starting Keycloak

Keycloak starts automatically with other dependencies:

```bash
yarn deps:up
```

Or start just Keycloak:

```bash
docker compose -f docker-compose-deps.yaml up -d keycloak
```

## Configuration File

The realm configuration is stored in `realm-export.json`. This file is automatically imported when Keycloak starts and
includes:

- Realm settings
- OAuth client configuration
- Test users with **fixed UUIDs** and credentials (ensures deterministic `sub` claims across database resets)
- Role definitions
- Protocol mappers for JWT claims

## Modifying Configuration

To modify the realm configuration:

1. Make changes through the Keycloak Admin UI at http://localhost:5080/admin
2. Export the realm:
   - Go to Realm Settings → Export
   - Enable "Export groups and roles" and "Export clients"
   - Download the JSON file
3. Replace `realm-export.json` with the exported configuration
4. Restart the Keycloak container to test the new configuration

## JWT Token Structure

Keycloak issues JWT tokens with the following claims:

```json
{
  "sub": "00000000-0000-0000-0000-000000000001",
  "iss": "http://localhost:5080/realms/prividium",
  "aud": "prividium-client",
  "email": "admin@local.dev",
  "preferred_username": "admin@local.dev",
  "exp": 1234567890,
  "iat": 1234567890
}
```

**Important**: The `sub` claim contains the user's UUID (configured in `realm-export.json`), not their email address.
This UUID is immutable and is used for secure user identification and admin role assignment in the Permissions API.

These tokens are compatible with the existing Okta JWT validation code in the Permissions API.

## Troubleshooting

### Keycloak won't start

- Check if port 5080 is already in use: `lsof -i :5080`
- Check Docker logs: `docker compose -f docker-compose-deps.yaml logs keycloak`

### Login fails

- Verify Keycloak is healthy: `docker compose -f docker-compose-deps.yaml ps keycloak`
- Check the realm was imported correctly by accessing the Admin UI

### JWT validation fails

- Verify the JWKS endpoint is accessible: `curl http://localhost:5080/realms/prividium/protocol/openid-connect/certs`
- Check that environment variables point to the correct Keycloak URLs
- Ensure the issuer and audience in the JWT match the configuration

## Environment Variables

The following environment variables configure apps to use local Keycloak:

**Permissions API** (`apps/permissions-api/.env`):

```bash
# Authentication methods (enable both OIDC and crypto-native)
AUTH_METHODS=oidc,crypto_native

# OIDC JWT validation
OIDC_JWKS_URI=http://localhost:5080/realms/prividium/protocol/openid-connect/certs
OIDC_JWT_AUD=prividium-client
OIDC_JWT_ISSUER=http://localhost:5080/realms/prividium

# Admin user configuration (UUID/sub claims from realm-export.json)
# Works with any OIDC provider - comma-separated list of user "sub" claims
OIDC_ADMIN_SUBS=00000000-0000-0000-0000-000000000001

# Crypto-native (SIWE) authentication configuration
SIWE_CHAIN_ID=6565
SIWE_VALID_DOMAINS=localhost:3000,localhost:3001
```

**Frontend Apps** (`apps/user-panel/.env`, etc.):

```bash
# Authentication methods available in the UI
VITE_AUTH_METHODS=crypto_native,oidc

# OIDC Configuration (Local Keycloak)
VITE_OIDC_AUTHORITY=http://localhost:5080/realms/prividium
VITE_OIDC_CLIENT_ID=prividium-client
VITE_OIDC_REDIRECT_URI=http://localhost:3001/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3001/login
VITE_OIDC_BUTTON_TEXT=Sign in with Keycloak
```
