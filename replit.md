# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (jsonwebtoken + bcryptjs)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── anon-app/           # React + Vite frontend (anonymous messaging platform)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Application: Anonymous Messaging Platform

A full-stack anonymous messaging platform similar to NGL/Tellonym.

### Features
- User registration & login with JWT auth
- Public feed with anonymous/named post toggle
- Profile links (`/u/:username`) for receiving anonymous messages
- Private inbox with conversation threads and reply support
- User directory for sending anonymous messages
- Rate limiting, content filtering (profanity/malicious links), CSRF-free JWT auth
- Profile picture uploads (avatar) stored in Replit Object Storage
- Image attachments on public feed posts and messages (inbox/sent/profile)
- Persistent anonymous aliases per conversation thread

### Database Schema
- `users` — id, username, email, password_hash, created_at
- `public_posts` — id, user_id (nullable), content, is_anonymous, created_at
- `conversations` — id, owner_id, guest_session_id, created_at
- `messages` — id, conversation_id, sender_id (nullable), body, is_read, created_at
- `rate_limits` — id, ip_address, action, created_at

### API Routes (all under /api)
- `POST /auth/register` — register
- `POST /auth/login` — login (returns JWT)
- `POST /auth/logout` — logout
- `GET /auth/me` — get current user
- `GET /feed` — public post feed
- `POST /feed` — create post (authenticated)
- `GET /users` — list all users
- `GET /users/:username` — get profile
- `POST /users/:username/message` — send anonymous message
- `GET /inbox` — list conversations (authenticated)
- `GET /inbox/unread-count` — unread count (authenticated)
- `GET /inbox/:id` — get conversation messages (authenticated)
- `POST /inbox/:id/reply` — reply to conversation (authenticated)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (set in Replit secrets)
