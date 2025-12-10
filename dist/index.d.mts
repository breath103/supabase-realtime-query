import { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { SupabaseClient } from '@supabase/supabase-js';
import * as _tanstack_react_query from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { Observable } from 'rxjs';
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import * as _tanstack_query_core from '@tanstack/query-core';

/**
 * Generic database schema type constraint.
 * Your Supabase-generated Database type should satisfy this.
 */
type DatabaseSchema = {
    [schema: string]: {
        Tables: {
            [table: string]: {
                Row: {
                    id: string | number;
                };
                Insert: Record<string, unknown>;
                Update: Record<string, unknown>;
                Relationships: unknown[];
            };
        };
        Views: Record<string, unknown>;
        Functions: Record<string, unknown>;
        Enums: Record<string, unknown>;
        CompositeTypes: Record<string, unknown>;
    };
};
/**
 * Extract table names from a schema
 */
type TableNames<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase = "public"> = keyof TDatabase[TSchema]["Tables"] & string;
/**
 * Extract row type for a table
 */
type TableRow<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>> = TDatabase[TSchema]["Tables"][TTable]["Row"];
/**
 * Extract insert type for a table
 */
type TableInsert<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>> = TDatabase[TSchema]["Tables"][TTable]["Insert"];
/**
 * Extract update type for a table
 */
type TableUpdate<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>> = TDatabase[TSchema]["Tables"][TTable]["Update"];
/**
 * Extract the ID type for a table
 */
type TableID<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>> = TableRow<TDatabase, TSchema, TTable>["id"];
/**
 * Realtime event types
 */
type RealtimeEvent<TTable extends string, TRow extends {
    id: any;
}> = {
    operation: "INSERT";
    table: TTable;
    record: TRow;
} | {
    operation: "UPDATE";
    table: TTable;
    record: TRow;
    old_record: TRow;
} | {
    operation: "DELETE";
    table: TTable;
    old_record: TRow;
};
/**
 * Sort configuration for list queries.
 * The key parameter allows type-safe access to a specific column for sorting.
 */
type Sort<TRow, TKey extends keyof TRow = keyof TRow> = {
    key: TKey;
    comparable: (value: TRow[TKey]) => number;
    order: "asc" | "desc";
};
/**
 * Helper to create sort configuration
 */
declare function sort<TRow, TKey extends keyof TRow>(key: TKey, comparable: (value: TRow[TKey]) => number, order: "asc" | "desc"): Sort<TRow, TKey>;

/**
 * Filter builder type for query construction.
 * Uses `any` for schema to avoid complex type constraints from postgrest-js.
 */
type FilterBuilder<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>> = PostgrestFilterBuilder<any, any, TableRow<TDatabase, TSchema, TTable>, TableRow<TDatabase, TSchema, TTable>[], unknown, unknown, "GET">;
/**
 * Configuration for creating a Repository
 */
type RepositoryConfig<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase> = {
    supabase: SupabaseClient<TDatabase>;
    schema: TSchema;
    events$: Observable<RealtimeEvent<TableNames<TDatabase, TSchema>, any>>;
};
/**
 * Repository - manages Supabase data with React Query caching and realtime updates
 */
declare class Repository<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase> {
    readonly queryClient: QueryClient;
    private readonly supabase;
    private readonly schema;
    private readonly subscription;
    constructor(config: RepositoryConfig<TDatabase, TSchema>);
    /**
     * Get a record from cache by ID (does not fetch)
     */
    getRecordByIdFromCache<TTable extends TableNames<TDatabase, TSchema>>(table: TTable, id: TableRow<TDatabase, TSchema, TTable>["id"] | null): TableRow<TDatabase, TSchema, TTable> | null | undefined;
    /**
     * Create a new record
     */
    createRecord<TTable extends TableNames<TDatabase, TSchema>>(table: TTable, insert: Partial<TableRow<TDatabase, TSchema, TTable>>): Promise<unknown>;
    /**
     * Update an existing record
     */
    updateRecord<TTable extends TableNames<TDatabase, TSchema>>(table: TTable, id: TableRow<TDatabase, TSchema, TTable>["id"], update: Partial<TableUpdate<TDatabase, TSchema, TTable>>): Promise<unknown>;
    /**
     * Delete a record
     */
    deleteRecord<TTable extends TableNames<TDatabase, TSchema>>(table: TTable, id: TableRow<TDatabase, TSchema, TTable>["id"]): Promise<unknown>;
    /**
     * Get a single record by ID
     */
    getRecordById<TTable extends TableNames<TDatabase, TSchema>>(table: TTable, id: TableRow<TDatabase, TSchema, TTable>["id"]): Promise<TableRow<TDatabase, TSchema, TTable> | null>;
    /**
     * Get multiple records by IDs
     */
    getRecordByIds<TTable extends TableNames<TDatabase, TSchema>>(table: TTable, ids: TableRow<TDatabase, TSchema, TTable>["id"][]): Promise<TableRow<TDatabase, TSchema, TTable>[]>;
    /**
     * Get records with a custom query, caching each result
     */
    getRecords<TTable extends TableNames<TDatabase, TSchema>>(table: TTable, query: (filter: FilterBuilder<TDatabase, TSchema, TTable>) => FilterBuilder<TDatabase, TSchema, TTable>): Promise<TableRow<TDatabase, TSchema, TTable>[]>;
    private throwIfError;
    /**
     * Clean up subscriptions and cache
     */
    destroy(): void;
}

/**
 * Query key factory for consistent cache key generation
 */
declare function recordQueryKey(table: string, id: string | number): readonly [string, string | number];
declare function recordListQueryKey(table: string, listName: string): readonly [string, "list", string];
declare function recordByIdsQueryKey(table: string, ids: (string | number)[]): readonly [string, "byIds", string];

/**
 * Create a typed repository context for your database schema
 */
declare function createRepositoryContext<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase>(): {
    RepositoryContext: react.Context<Repository<TDatabase, TSchema> | null>;
    RepositoryProvider: ({ config, children }: {
        config: RepositoryConfig<TDatabase, TSchema>;
        children: React.ReactNode;
    }) => react_jsx_runtime.JSX.Element;
    useRepository: () => Repository<TDatabase, TSchema>;
};

/**
 * Hook to get a single record by ID with realtime updates
 */
declare function useRecordById<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>>(repository: Repository<TDatabase, TSchema>, table: TTable, id: TableRow<TDatabase, TSchema, TTable>["id"] | null): _tanstack_react_query.UseQueryResult<_tanstack_query_core.NoInfer<TableRow<TDatabase, TSchema, TTable> | null>, Error>;
/**
 * Hook to get multiple records by IDs with realtime updates
 */
declare function useRecordByIds<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>>(repository: Repository<TDatabase, TSchema>, table: TTable, ids: TableRow<TDatabase, TSchema, TTable>["id"][]): _tanstack_react_query.UseQueryResult<TableRow<TDatabase, TSchema, TTable>[], Error>;
/**
 * Hook to get a list of records with custom query, sorting, and filtering
 */
declare function useRecordListQuery<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>>(repository: Repository<TDatabase, TSchema>, table: TTable, listName: string, options: {
    query: (filter: FilterBuilder<TDatabase, TSchema, TTable>) => FilterBuilder<TDatabase, TSchema, TTable>;
    sort: Sort<TableRow<TDatabase, TSchema, TTable>, any>;
    filter?: (item: TableRow<TDatabase, TSchema, TTable>) => boolean;
}): _tanstack_react_query.UseQueryResult<TableRow<TDatabase, TSchema, TTable>[], Error>;
/**
 * Hook to update a record
 */
declare function useUpdateRecord<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>>(repository: Repository<TDatabase, TSchema>, table: TTable): _tanstack_react_query.UseMutationResult<unknown, Error, {
    id: TableRow<TDatabase, TSchema, TTable>["id"];
    update: Partial<TableUpdate<TDatabase, TSchema, TTable>>;
}, unknown>;
/**
 * Hook to delete a record
 */
declare function useDeleteRecord<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>>(repository: Repository<TDatabase, TSchema>, table: TTable): _tanstack_react_query.UseMutationResult<unknown, Error, TableRow<TDatabase, TSchema, TTable>["id"], unknown>;

/**
 * Configuration for creating a realtime channel
 */
type RealtimeChannelConfig<TDatabase extends DatabaseSchema> = {
    supabase: SupabaseClient<TDatabase>;
    channelName: string;
    /** Whether the channel is private (requires RLS) */
    isPrivate?: boolean;
};
/**
 * Create an Observable that emits realtime events from a Supabase broadcast channel
 *
 * The channel expects broadcast events in the format:
 * { operation: 'INSERT' | 'UPDATE' | 'DELETE', table: string, record?: {...}, old_record?: {...} }
 */
declare function createRealtimeChannel<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase = "public">(config: RealtimeChannelConfig<TDatabase>): Observable<RealtimeEvent<TableNames<TDatabase, TSchema>, any>>;

/**
 * Prefetch a record by ID for server-side rendering
 */
declare function prefetchRecordById<TDatabase extends DatabaseSchema, TSchema extends keyof TDatabase, TTable extends TableNames<TDatabase, TSchema>>(queryClient: QueryClient, supabase: SupabaseClient<TDatabase>, schema: TSchema, table: TTable, id: TableRow<TDatabase, TSchema, TTable>["id"]): Promise<void>;

export { type DatabaseSchema, type FilterBuilder, type RealtimeChannelConfig, type RealtimeEvent, Repository, type RepositoryConfig, type Sort, type TableID, type TableInsert, type TableNames, type TableRow, type TableUpdate, createRealtimeChannel, createRepositoryContext, prefetchRecordById, recordByIdsQueryKey, recordListQueryKey, recordQueryKey, sort, useDeleteRecord, useRecordById, useRecordByIds, useRecordListQuery, useUpdateRecord };
