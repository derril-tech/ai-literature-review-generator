AI Literature Review Generator — Docs

Structure:
- Architecture overview in `ARCH.md`
- Delivery plan in `PLAN.md`
- Phased TODO in `TODO.md`
- Product requirements in `PRODUCT_BRIEF.md`

Getting Started (dev):
- Bring up infra: `docker compose -f infra/docker-compose.dev.yml up -d`
- Install JS deps: `npm install`
- Run frontend: `npm run dev --workspace=frontend`
- Run API: `npm run start:dev --workspace=api`
- Workers: `pip install -e workers/[dev]`

