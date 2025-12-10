/* eslint-disable @typescript-eslint/no-explicit-any */

import { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";

import { recordQueryKey } from "./query-keys";
import { DatabaseSchema, TableNames, TableRow } from "./types";

/**
 * Prefetch a record by ID for server-side rendering
 */
export async function prefetchRecordById<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
>(
  queryClient: QueryClient,
  supabase: SupabaseClient<TDatabase>,
  schema: TSchema,
  table: TTable,
  id: TableRow<TDatabase, TSchema, TTable>["id"]
) {
  return queryClient.prefetchQuery({
    queryKey: recordQueryKey(table, id),
    queryFn: async () => {
      const res = await (supabase as any)
        .schema(schema)
        .from(table)
        .select()
        .eq("id", id)
        .maybeSingle();
      if (res.error) throw res.error;
      return res.data;
    }
  });
}
