/* eslint-disable @typescript-eslint/no-explicit-any */

import { type PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { type SupabaseClient } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";
import { Observable, Subscription } from "rxjs";

import { recordQueryKey } from "./query-keys";
import { DatabaseSchema, RealtimeEvent, TableNames, TableRow, TableUpdate } from "./types";

/**
 * Filter builder type for query construction.
 * Uses `any` for schema to avoid complex type constraints from postgrest-js.
 */
export type FilterBuilder<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
> = PostgrestFilterBuilder<
  any,
  any,
  TableRow<TDatabase, TSchema, TTable>,
  TableRow<TDatabase, TSchema, TTable>[],
  unknown,
  unknown,
  "GET"
>;

/**
 * Configuration for creating a Repository
 */
export type RepositoryConfig<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase
> = {
  supabase: SupabaseClient<TDatabase>;
  schema: TSchema;
  /** Realtime events observable. Pass null to disable realtime updates (e.g., during SSR). */
  events$: Observable<RealtimeEvent<TableNames<TDatabase, TSchema>, any>> | null;
};

/**
 * Repository - manages Supabase data with React Query caching and realtime updates
 */
export class Repository<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase
> {
  public readonly queryClient: QueryClient;
  private readonly supabase: SupabaseClient<TDatabase>;
  private readonly schema: TSchema;
  private readonly subscription: Subscription | null;

  public constructor(config: RepositoryConfig<TDatabase, TSchema>) {
    this.supabase = config.supabase;
    this.schema = config.schema;

    this.queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchInterval: false,
          refetchOnReconnect: false,
          staleTime: Infinity,
          gcTime: Infinity
        }
      }
    });

    // Subscribe to realtime events and update cache (skip if events$ is null, e.g., during SSR)
    this.subscription = config.events$?.subscribe((payload) => {
      const table = payload.table;

      if (payload.operation === "INSERT") {
        this.queryClient.setQueryData(
          recordQueryKey(table, payload.record.id),
          payload.record
        );
      } else if (payload.operation === "UPDATE") {
        this.queryClient.setQueryData(
          recordQueryKey(table, payload.record.id),
          payload.record
        );
      } else if (payload.operation === "DELETE") {
        this.queryClient.removeQueries({
          queryKey: recordQueryKey(table, payload.old_record.id)
        });
      }
    }) ?? null;
  }

  /**
   * Get a record from cache by ID (does not fetch)
   */
  getRecordByIdFromCache<TTable extends TableNames<TDatabase, TSchema>>(
    table: TTable,
    id: TableRow<TDatabase, TSchema, TTable>["id"] | null
  ): TableRow<TDatabase, TSchema, TTable> | null | undefined {
    if (id === null) return null;
    return this.queryClient.getQueryData(recordQueryKey(table, id));
  }

  /**
   * Create a new record
   */
  async createRecord<TTable extends TableNames<TDatabase, TSchema>>(
    table: TTable,
    insert: Partial<TableRow<TDatabase, TSchema, TTable>>
  ) {
    const response = await (this.supabase as any)
      .schema(this.schema)
      .from(table)
      .insert(insert);
    return this.throwIfError(response);
  }

  /**
   * Update an existing record
   */
  async updateRecord<TTable extends TableNames<TDatabase, TSchema>>(
    table: TTable,
    id: TableRow<TDatabase, TSchema, TTable>["id"],
    update: Partial<TableUpdate<TDatabase, TSchema, TTable>>
  ) {
    const response = await (this.supabase as any)
      .schema(this.schema)
      .from(table)
      .update(update)
      .eq("id", id);
    return this.throwIfError(response);
  }

  /**
   * Delete a record
   */
  async deleteRecord<TTable extends TableNames<TDatabase, TSchema>>(
    table: TTable,
    id: TableRow<TDatabase, TSchema, TTable>["id"]
  ) {
    const response = await (this.supabase as any)
      .schema(this.schema)
      .from(table)
      .delete()
      .eq("id", id);
    return this.throwIfError(response);
  }

  /**
   * Get a single record by ID
   */
  async getRecordById<TTable extends TableNames<TDatabase, TSchema>>(
    table: TTable,
    id: TableRow<TDatabase, TSchema, TTable>["id"]
  ): Promise<TableRow<TDatabase, TSchema, TTable> | null> {
    const response = await (this.supabase as any)
      .schema(this.schema)
      .from(table)
      .select()
      .eq("id", id)
      .maybeSingle();
    return this.throwIfError(response);
  }

  /**
   * Get multiple records by IDs
   */
  async getRecordByIds<TTable extends TableNames<TDatabase, TSchema>>(
    table: TTable,
    ids: TableRow<TDatabase, TSchema, TTable>["id"][]
  ): Promise<TableRow<TDatabase, TSchema, TTable>[]> {
    if (ids.length === 0) return [];
    const response = await (this.supabase as any)
      .schema(this.schema)
      .from(table)
      .select()
      .in("id", ids);
    return this.throwIfError(response);
  }

  /**
   * Get records with a custom query, caching each result
   */
  async getRecords<TTable extends TableNames<TDatabase, TSchema>>(
    table: TTable,
    query: (filter: FilterBuilder<TDatabase, TSchema, TTable>) => FilterBuilder<TDatabase, TSchema, TTable>
  ): Promise<TableRow<TDatabase, TSchema, TTable>[]> {
    const baseQuery = (this.supabase as any).schema(this.schema).from(table).select();
    const response = await query(baseQuery);
    const records = this.throwIfError(response) as TableRow<TDatabase, TSchema, TTable>[];

    // Cache individual records
    records.forEach((item) => {
      this.queryClient.setQueryData(recordQueryKey(table, (item as any).id), item);
    });

    return records;
  }

  private throwIfError<T>(response: { data: T; error: null } | { data: null; error: Error }): T {
    if (response.error) throw response.error;
    return response.data;
  }

  /**
   * Clean up subscriptions and cache
   */
  destroy() {
    this.subscription?.unsubscribe();
    this.queryClient.clear();
  }
}
