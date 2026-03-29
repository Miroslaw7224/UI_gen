# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack at http://localhost:3000

# Database
npm run setup        # Install deps + prisma generate + migrate (first time setup)
npm run db:reset     # Reset database to empty state

# Build & production
npm run build
npm run start

# Tests
npm run test                          # Run all tests
npx vitest run src/path/to/file.test  # Run a single test file
```

## Environment

- `ANTHROPIC_API_KEY` in `.env` — if missing, app falls back to `MockLanguageModel` (returns static demo components)
- `JWT_SECRET` — defaults to `"development-secret-key"` if not set

## Architecture

**UIGen** is an AI-powered React component generator. Users describe a UI in chat, Claude generates/edits code using tool calls, and the result renders live in a sandboxed iframe.

### Request flow

1. User submits message → `ChatProvider` (`chat-context.tsx`) → Vercel AI SDK `useChat()` → `POST /api/chat`
2. `/api/chat/route.ts` calls Claude via `streamText()` with two tools:
   - `str_replace_editor` — create/edit/insert/replace file content in the virtual FS
   - `file_manager` — rename/delete files
3. Tool call results stream back and are processed by `handleToolCall()` in `FileSystemContext`
4. On stream completion, messages + FS state saved to SQLite via Prisma (authenticated users only)
5. Files in the virtual FS are Babel-transformed (JSX → JS) and injected into a sandboxed iframe with an import map pointing to esm.sh CDN

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is an **in-memory** file tree stored in React state. It never touches disk. It serializes to/from a JSON string stored in `Project.data` in the database.

### Auth

JWT stored in an `auth-token` httpOnly cookie (7-day expiry). Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem`. Anonymous users can use the app but their work is not persisted.

### Database schema (SQLite + Prisma)

- `User`: id, email, password (bcrypt), projects[]
- `Project`: id, name, userId, messages (JSON string), data (JSON string — serialized VirtualFileSystem)

### Key files

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | AI streaming endpoint, orchestrates tool calls |
| `src/lib/contexts/chat-context.tsx` | Chat state, Vercel AI SDK integration |
| `src/lib/contexts/file-system-context.tsx` | Virtual FS state, tool call handler |
| `src/lib/file-system.ts` | VirtualFileSystem class |
| `src/lib/provider.ts` | Selects real Claude model or MockLanguageModel |
| `src/lib/prompts/generation.tsx` | System prompt for component generation |
| `src/lib/transform/jsx-transformer.ts` | Babel JSX transform + import map for preview |
| `src/lib/auth.ts` | JWT session create/verify/delete |
| `src/middleware.ts` | Auth middleware for API routes |
| `prisma/schema.prisma` | Database schema |
| `node-compat.cjs` | Node.js compatibility shim required at startup |

### Windows note

Scripts use `cross-env` to set `NODE_OPTIONS` (required for `node-compat.cjs`). Do not remove `cross-env` from scripts in `package.json`.

## Collaboration & asking for help

When something isn't working and a second attempt won't clearly fix it — stop and ask the user. Don't loop through workarounds or force a solution alone. The user can often unblock things in seconds.

Ask for help when:
- An action requires something outside your control (restarting a process, refreshing a browser tab, unlocking a file)
- A build or tooling error persists after one fix attempt
- The environment behaves unexpectedly (wrong port, stale cache, missing env var)
- Requirements or context are ambiguous and guessing will waste effort

Just describe the situation briefly and say what you need: *"X is happening, could you do Y?"* — then wait. Don't silently retry the same failing action.
