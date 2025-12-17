# Node Project Template

> An opinionated full-stack monorepo template for modern web applications

This template provides a production-ready foundation for building scalable web applications using battle-tested technologies and best practices. It's designed for teams that want to start with a solid architecture rather than making fundamental decisions from scratch.

## 🎯 What Makes This Opinionated?

We've made deliberate choices to eliminate decision fatigue:

- **Nx Monorepo**: For efficient code sharing and tooling across apps
- **NestJS + Angular**: TypeScript-first frameworks with excellent DX
- **PostgreSQL + MikroORM**: Robust database with type-safe queries
- **Docker First**: Containerized development and deployment
- **OAuth 2.0**: Built-in authentication with Dex (OpenID Connect)
- **Dev Dashboard**: Custom tooling for local development

## 🚀 Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **MikroORM** - TypeScript ORM for PostgreSQL
- **JWT + OAuth 2.0** - Authentication & authorization

### Frontend
- **Angular** - Enterprise-ready SPA framework
- **RxJS** - Reactive programming
- **SCSS** - Component-scoped styling

### Infrastructure
- **Nx** - Smart monorepo build system
- **Docker & Docker Compose** - Containerization
- **PostgreSQL** - Primary database
- **Dex** - OpenID Connect provider

### Development
- **Jest** - Unit testing
- **Playwright** - E2E testing
- **ESLint + Prettier** - Code quality
- **Custom Dev Dashboard** - Local development tooling

## 🏁 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- VS Code (recommended)

### Installation

```bash
# Clone the template
git clone https://github.com/Grax32/new-project-template.git my-project
cd my-project

# Install dependencies
pnpm install

# Start development environment
pnpm dev
```

Visit:
- **Web App**: http://localhost:4200
- **API**: http://localhost:6314
- **Dev Dashboard**: http://localhost:4500
- **Dex OAuth**: http://localhost:5556/dex

## 📁 Project Structure

```
node-project-template/
├── apps/
│   ├── api/                 # NestJS API server
│   │   ├── src/
│   │   │   ├── controllers/ # HTTP endpoints
│   │   │   ├── entities/    # Database models
│   │   │   ├── services/    # Business logic
│   │   │   └── main.ts      # Application entry
│   │   └── mikro-orm.config.ts
│   ├── web/                 # Angular application
│   │   ├── src/
│   │   │   ├── app/         # Angular components
│   │   │   └── styles.scss  # Global styles
│   └── web-e2e/            # E2E tests
├── shared/
│   └── models/             # Shared TypeScript types
├── dev-dashboard/          # Custom development tooling
├── docker/
│   ├── postgres/           # Database setup
│   └── dex/               # OAuth provider config
├── packages/               # Future shared libraries
├── migrations/            # Database migrations
├── docker-compose.yml     # Local services
├── nx.json               # Nx configuration
└── package.json          # Root dependencies
```

## 🛠️ Development Workflow

### Daily Development

```bash
# Start everything
pnpm dev

# Or start services individually
pnpm docker:up      # Database + OAuth
pnpm dev:api        # API server only
pnpm dev:web        # Frontend only
```

### Database Operations

```bash
# Create migration
pnpm mikro:migrate:create

# Run migrations
pnpm mikro:migrate:up

# Rollback
pnpm mikro:migrate:down
```

### Testing

```bash
# Unit tests
nx test api
nx test web

# E2E tests
nx e2e web-e2e
```

## Dev Dashboard

A custom web interface for managing your development environment:

```bash
pnpm dev-dashboard
```

Features:
- **Docker Services**: Start/stop/restart containers
- **Programs**: Manage API and web dev servers
- **Logs**: Real-time log viewing
- **Status Monitoring**: Live updates via SSE

### Docker Deployment

```bash
# Build production images
docker build -t my-api ./apps/api
docker build -t my-web ./apps/web

# Deploy with docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d
```

## 🔧 Available Scripts

### Development
- `pnpm dev` - Start full development environment
- `pnpm dev:api` - API server only
- `pnpm dev:web` - Frontend only
- `pnpm dev-dashboard` - Launch dev dashboard

### Docker
- `pnpm docker:up` - Start containers
- `pnpm docker:down` - Stop containers
- `pnpm docker:logs` - View container logs
- `pnpm docker:reset` - Reset database

### Database
- `pnpm mikro:migrate:create` - Create migration
- `pnpm mikro:migrate:up` - Run migrations
- `pnpm mikro:migrate:down` - Rollback migration

## 🎨 Design Decisions

### Why Nx?
- **Code Sharing**: Libraries shared between API and web
- **Caching**: Smart rebuilds based on dependency graphs
- **Tooling**: Generators, migrations, and plugins
- **Scaling**: Proven for large enterprise monorepos

### Why NestJS?
- **Modular Architecture**: Dependency injection, modules
- **TypeScript First**: Excellent type safety
- **Enterprise Ready**: Guards, interceptors, pipes
- **Ecosystem**: Rich plugin ecosystem

### Why MikroORM?
- **Type Safety**: Entity definitions generate types
- **Performance**: Identity map, unit of work
- **Migrations**: Database schema versioning
- **Query Builder**: Type-safe query APIs

### Why Docker First?
- **Consistency**: Same environment everywhere
- **Isolation**: No "works on my machine" issues
- **Scalability**: Easy horizontal scaling
- **CI/CD**: Same containers for testing and production

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** changes: `git commit -am 'Add my feature'`
4. **Push** to branch: `git push origin feature/my-feature`
5. **Submit** a Pull Request

### Code Quality
- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Use conventional commits

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Port conflicts?**
```bash
# Check what's using ports
netstat -ano | findstr :4200
netstat -ano | findstr :6314
```

**Database connection issues?**
```bash
# Reset database
pnpm docker:reset
pnpm mikro:migrate:up
```

**Permission issues with Docker?**
```bash
# On Windows, ensure Docker Desktop is running
# On Linux/Mac, you might need sudo
```

### Getting Help

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup
- Review [architecture.md](architecture.md) for project structure
- Open an issue for bugs or feature requests

---

**Happy coding!** 🎉 This template is designed to get you productive quickly while following industry best practices.