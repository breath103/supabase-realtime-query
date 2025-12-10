/* eslint-disable @typescript-eslint/no-explicit-any */

import { SupabaseClient } from "@supabase/supabase-js";
import { Observable } from "rxjs";
import { AnonymousSubject } from "rxjs/internal/Subject";

import { DatabaseSchema, RealtimeEvent, TableNames } from "./types";

/**
 * Configuration for creating a realtime channel
 */
export type RealtimeChannelConfig<TDatabase extends DatabaseSchema> = {
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
export function createRealtimeChannel<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase = "public"
>(
  config: RealtimeChannelConfig<TDatabase>
): Observable<RealtimeEvent<TableNames<TDatabase, TSchema>, any>> {
  const observable = new Observable<RealtimeEvent<TableNames<TDatabase, TSchema>, any>>((subscriber) => {
    const channel = config.supabase
      .channel(config.channelName, {
        config: {
          private: config.isPrivate ?? false
        }
      })
      .on("broadcast", { event: "*" }, ({ payload }) => {
        subscriber.next(payload as any);
      })
      .subscribe();

    subscriber.add(() => {
      channel.unsubscribe();
    });
  });

  return new AnonymousSubject(undefined, observable);
}
