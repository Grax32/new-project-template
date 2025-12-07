# Project Architecture Overview

## Overview
This project is a full-stack Nx monorepo template designed for rapid development of modern web applications. It features:
- **Nx Monorepo** for efficient workspace management
- **Node.js** backend with **NestJS** (TypeScript)
- **Angular** frontend (TypeScript)
- **OAuth** authentication
- **Dependency Injection** (DI) throughout
- **Unit and Integration Tests**
- **Dockerized** for local and production deployments
- **PostgreSQL** as the primary database

## Monorepo Structure
```
node-project-template/
├── apps/
│   ├── api/                 # NestJS API server (port 6314)
│   │   ├── src/
│   │   │   ├── app.controller.ts
│   │   │   ├── app.module.ts
│   │   │   ├── app.service.ts
│   │   │   └── main.ts
│   │   ├── project.json     # Nx project configuration
│   │   ├── tsconfig.json
│   │   └── jest.config.ts
│   ├── web/                 # Angular web application (port 4200)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── styles.scss
│   │   ├── project.json
│   │   ├── tsconfig.json
│   │   └── jest.config.ts
│   └── web-e2e/            # Playwright E2E tests for web
├── shared/
│   └── models/             # Shared TypeScript models (API + Web)
│       ├── index.ts        # Barrel exports
│       ├── user.model.ts   # Example model
│       └── tsconfig.json   # Enforces no external dependencies
├── docker/
│   └── postgres/
│       └── init/           # Database initialization scripts
├── packages/               # Future shared libraries
├── docker compose.yml      # PostgreSQL service
├── nx.json                 # Nx workspace configuration
├── tsconfig.base.json      # Base TypeScript config with path mappings
└── package.json            # Root dependencies

```

## Architecture Diagram

```
[ Angular (TypeScript) ] <-> [ NestJS API (TypeScript) ] <-> [ PostgreSQL ]
           |                        |                              |
    Nx Build/Test            OAuth/DI/Docker                   Docker
```

## Key Features
- **Nx Monorepo** for unified build system, caching, and dependency management
- **TypeScript everywhere** for type safety
- **Dependency Injection** (NestJS and Angular) for modularity and testability
- **OAuth** for secure authentication
- **Docker** for consistent environments
- **PostgreSQL** for robust data storage
- **Unit/Integration Testing** with Jest for reliability

## Nx Benefits
- **Smart rebuilds** - Only rebuilds what changed
- **Computation caching** - Speeds up builds and tests
- **Code generation** - Scaffolds components, services, etc.
- **Dependency graph** - Visualizes project relationships
- **Consistent tooling** - Unified commands across all apps

## Available Commands
```bash
# Development
npm run dev              # Start Docker + API + Web in parallel
npm run dev:api          # Start API only
npm run dev:web          # Start Web only

# Nx commands
npx nx serve api         # Serve API with hot reload
npx nx serve web         # Serve Web with hot reload
npx nx build api         # Build API for production
npx nx build web         # Build Web for production
npx nx test api          # Run API unit tests
npx nx test web          # Run Web unit tests
npx nx e2e web-e2e       # Run E2E tests
npx nx lint api          # Lint API code
npx nx lint web          # Lint Web code

# Docker
npm run docker:up        # Start PostgreSQL
npm run docker:down      # Stop PostgreSQL
npm run docker:logs      # View PostgreSQL logs
npm run docker:reset     # Reset database (removes volumes)

# Utilities
npx nx graph             # View project dependency graph
npx nx affected:graph    # View affected projects
```

## Next Steps
- Implement OAuth authentication (both API and Web)
- Connect API to PostgreSQL using TypeORM or Prisma
- Add API endpoints for CRUD operations
- Create Angular components and services
- Expand shared models as needed
- Set up CI/CD pipeline
- Add comprehensive E2E tests
- Configure production Docker deployment

---

This file will be updated as the architecture is refined and the project is scaffolded.