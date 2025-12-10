# supabase-realtime-query

React Query integration for Supabase with automatic realtime cache updates.

## Project Structure

```
src/
├── index.ts        # Public exports
├── types.ts        # Generic type definitions (DatabaseSchema, TableRow, Sort, etc.)
├── query-keys.ts   # Query key factories for React Query
├── repository.ts   # Core Repository class with CRUD + cache management
├── context.tsx     # createRepositoryContext() factory for React
├── hooks.tsx       # useRecordById, useRecordByIds, useRecordListQuery, etc.
├── realtime.ts     # createRealtimeChannel() - Observable for Supabase broadcast
└── server.ts       # prefetchRecordById() for SSR
```

## Development

```bash
npm install      # Install dependencies
npm run build    # Build with tsup
npm run dev      # Watch mode
npm run typecheck # Type check
```

## Publishing

Push to `main` branch triggers GitHub Actions to publish to npm automatically.
Bump version before pushing: `npm version patch -m "Bump to %s"`

## Key Design Decisions

- **Generic over Database type** - Consumer passes their Supabase-generated `Database` type
- **Factory pattern** - `createRepositoryContext<Database, "public">()` returns typed context/hooks
- **RxJS for realtime** - Supabase broadcast events flow through Observable
- **React Query for cache** - Realtime events automatically update queryClient cache

## Peer Dependencies

- `@supabase/supabase-js` ^2.0.0
- `@tanstack/react-query` ^5.0.0
- `rxjs` ^7.0.0
- `react` ^18.0.0 || ^19.0.0
