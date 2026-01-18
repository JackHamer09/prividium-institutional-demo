# Prividium Utils

Database seed scripts and Docker Compose for local Prividium setup.

## Seed Scripts

Seed the permissions databases after starting Docker:

```bash
docker exec -i zksync-prividium-institutional-demo-postgres-1 psql -U postgres -d permissions_api_l2a < prividium-utils/dev/seed-permissions-l2a.sql

docker exec -i zksync-prividium-institutional-demo-postgres-1 psql -U postgres -d permissions_api_l2b < prividium-utils/dev/seed-permissions-l2b.sql
```
