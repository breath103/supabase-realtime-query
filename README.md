# supabase-realtime-query

React Query integration for Supabase with automatic realtime cache updates.

## Features

- **Automatic cache updates** - Supabase realtime events automatically update React Query cache
- **Type-safe** - Full TypeScript support with your Supabase-generated database types
- **Minimal boilerplate** - Factory pattern creates typed hooks for your schema
- **SSR support** - Server-side prefetching utilities included

## Installation

```bash
npm install supabase-realtime-query
```

### Peer Dependencies

```bash
npm install @supabase/supabase-js @tanstack/react-query rxjs
```

## Quick Start

### 1. Create typed repository context

```typescript
// lib/repository.ts
import { createRepositoryContext, createRealtimeChannel } from "supabase-realtime-query";
import { Database } from "./database.types"; // Your Supabase generated types

export const {
  RepositoryProvider,
  useRepository,
} = createRepositoryContext<Database, "public">();
```

### 2. Set up the provider

```tsx
// app/providers.tsx
"use client";

import { RepositoryProvider } from "@/lib/repository";
import { createRealtimeChannel } from "supabase-realtime-query";
import { supabase } from "@/lib/supabase";

export function Providers({ children, userId }: { children: React.ReactNode; userId: string }) {
  const config = useMemo(() => ({
    supabase,
    schema: "public" as const,
    events$: createRealtimeChannel({
      supabase,
      channelName: `user:${userId}`,
      isPrivate: true
    })
  }), [userId]);

  return (
    <RepositoryProvider config={config}>
      {children}
    </RepositoryProvider>
  );
}
```

### 3. Use the hooks

```tsx
import { useRecordById, useRecordListQuery, sort } from "supabase-realtime-query";
import { useRepository } from "@/lib/repository";

function MyComponent() {
  const repository = useRepository();

  // Single record
  const { data: user } = useRecordById(repository, "users", userId);

  // List with query
  const { data: items } = useRecordListQuery(
    repository,
    "items",
    "my-items",
    {
      query: (q) => q.eq("user_id", userId),
      sort: sort("created_at", (v) => new Date(v).getTime(), "desc")
    }
  );

  return <div>{user?.name}</div>;
}
```

## API Reference

### Hooks

- `useRecordById(repository, table, id)` - Fetch single record by ID
- `useRecordByIds(repository, table, ids)` - Fetch multiple records by IDs
- `useRecordListQuery(repository, table, listName, options)` - Fetch list with query/sort/filter
- `useUpdateRecord(repository, table)` - Mutation hook for updates
- `useDeleteRecord(repository, table)` - Mutation hook for deletes

### Repository Methods

- `repository.getRecordByIdFromCache(table, id)` - Get cached record
- `repository.createRecord(table, data)` - Create new record
- `repository.updateRecord(table, id, data)` - Update record
- `repository.deleteRecord(table, id)` - Delete record
- `repository.getRecords(table, query)` - Custom query with caching

### Server Utilities

- `prefetchRecordById(queryClient, supabase, schema, table, id)` - SSR prefetching

## License

MIT
