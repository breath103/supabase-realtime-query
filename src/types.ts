/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Generic database schema type constraint.
 * Your Supabase-generated Database type should satisfy this.
 */
export type DatabaseSchema = {
  [schema: string]: {
    Tables: {
      [table: string]: {
        Row: { id: string | number };
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
export type TableNames<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase = "public"
> = keyof TDatabase[TSchema]["Tables"] & string;

/**
 * Extract row type for a table
 */
export type TableRow<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
> = TDatabase[TSchema]["Tables"][TTable]["Row"];

/**
 * Extract insert type for a table
 */
export type TableInsert<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
> = TDatabase[TSchema]["Tables"][TTable]["Insert"];

/**
 * Extract update type for a table
 */
export type TableUpdate<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
> = TDatabase[TSchema]["Tables"][TTable]["Update"];

/**
 * Extract the ID type for a table
 */
export type TableID<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
> = TableRow<TDatabase, TSchema, TTable>["id"];

/**
 * Realtime event types
 */
export type RealtimeEvent<TTable extends string, TRow extends { id: any }>
  = | {
    operation: "INSERT";
    table: TTable;
    record: TRow;
  }
  | {
    operation: "UPDATE";
    table: TTable;
    record: TRow;
    old_record: TRow;
  }
  | {
    operation: "DELETE";
    table: TTable;
    old_record: TRow;
  };

/**
 * Sort configuration for list queries.
 * The key parameter allows type-safe access to a specific column for sorting.
 */
export type Sort<TRow, TKey extends keyof TRow = keyof TRow> = {
  key: TKey;
  comparable: (value: TRow[TKey]) => number;
  order: "asc" | "desc";
};

/**
 * Helper to create sort configuration
 */
export function sort<TRow, TKey extends keyof TRow>(
  key: TKey,
  comparable: (value: TRow[TKey]) => number,
  order: "asc" | "desc"
): Sort<TRow, TKey> {
  return { key, comparable, order };
}
