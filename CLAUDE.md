# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is an Epic Stack application built with React Router 7, featuring a
full-stack TypeScript setup for building modern web applications with
authentication, database management, and comprehensive tooling.

## Development Commands

### Core Development

- `npm run dev` - Start development server with mocks enabled
- `npm run dev:no-mocks` - Start development server without mocks
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run start:mocks` - Start production server with mocks enabled

### Code Quality

- `npm run lint` - Lint the codebase with ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Type-check with TypeScript and generate React Router
  types
- `npm run validate` - Run all checks (tests, lint, typecheck, e2e tests)

### Testing

- `npm test` - Run unit tests with Vitest
- `npm run coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests in UI mode
- `npm run test:e2e:run` - Run e2e tests in CI mode
- `npm run test:e2e:install` - Install Playwright dependencies

### Database

- `npx prisma migrate deploy` - Deploy database migrations
- `npx prisma generate --sql` - Generate Prisma client with typed SQL
- `npx prisma studio` - Open Prisma Studio database GUI
- `npm run setup` - Full project setup (build + migrate + generate + playwright
  install)

## Architecture

### Framework & Routing

- **React Router 7** with SSR enabled
- **Flat routes** structure using remix-flat-routes
- Route-based code splitting and data loading
- File-based routing in `app/routes/` directory

### Database & ORM

- **SQLite** database with **Prisma** ORM
- Schema defined in `prisma/schema.prisma`
- Typed SQL queries supported via Prisma typedSql
- Database seeding via `prisma/seed.ts`

### Authentication & Security

- Multi-provider authentication (GitHub + local)
- Passkey/WebAuthn support
- Session-based authentication with secure cookies
- Role-based permissions system
- TOTP 2FA support
- Honeypot spam protection

### Styling & UI

- **Tailwind CSS 4** with Vite plugin
- **Radix UI** components with custom styling
- Icon system via SVG spritesheet (generated from `other/svg-icons/`)
- Dark/light theme support
- Responsive design patterns

### Key Directories

- `app/components/` - Reusable UI components and forms
- `app/routes/` - File-based route definitions
- `app/utils/` - Server and client utilities (auth, db, validation, etc.)
- `tests/` - Test files, fixtures, and test utilities
- `prisma/` - Database schema, migrations, and seed data
- `other/` - Build scripts, SVG icons, and configuration

### Testing Strategy

- **Vitest** for unit/integration tests
- **Playwright** for end-to-end tests
- **MSW** for API mocking in tests
- Test database utilities in `tests/db-utils.ts`
- Custom matchers and setup in `tests/setup/`

### Production Considerations

- **Sentry** integration for error monitoring
- **Docker** deployment support
- **Fly.io** configuration included
- LiteFS for SQLite replication
- Express server with rate limiting and compression

## Special Features

### Image Handling

- File uploads via form data parser
- Image optimization with Sharp
- CDN-style image serving at `/resources/images`
- Support for user avatars and note images

### Email System

- React Email components for templating
- Email verification flows
- Password reset functionality

### Development Tools

- Mock API responses via MSW
- Auto-generated TypeScript types
- Hot module replacement in development
- Comprehensive error boundaries
