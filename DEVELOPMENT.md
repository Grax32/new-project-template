# Development Environment Setup

## Quick Start

```bash
# Start everything (Docker + API + Web)
pnpm dev

# Or start individually
pnpm docker:up      # Start PostgreSQL
pnpm dev:api        # Start API only
pnpm dev:web        # Start Web only
```

## What's Running?

- **PostgreSQL**: http://localhost:5432
  - Database: `devdb`
  - User: `devuser`
  - Password: `devpass`

- **Dex OAuth**: http://localhost:5556/dex
  - Admin: admin@example.com / admin123
  - Member: member@example.com / member123
  - Discovery: http://localhost:5556/dex/.well-known/openid-configuration

- **API**: http://localhost:6314
  - Healthcheck: http://localhost:6314/healthcheck

- **Web**: http://localhost:4200

## Environment Variables

Copy `.env.example` to `.env` and customize:
```bash
cp .env.example .env
```

## Docker Commands

```bash
pnpm docker:up       # Start containers
pnpm docker:down     # Stop containers
pnpm docker:logs     # View logs
pnpm docker:reset    # Reset database (removes volumes)
```

## VS Code Debugging

Use the **Debug Full Stack** compound configuration to debug both API and Web simultaneously with breakpoints.

1. Press F5 or go to Run & Debug
2. Select "Debug Full Stack"
3. Set breakpoints in your code
4. Make sure Docker is running first!

## Hot Reload

Both API and Web have hot reload enabled:
- **API**: NestJS watch mode - changes restart the server automatically
- **Web**: Angular dev server - changes refresh the browser automatically
