// src/repository.ts
import { QueryClient } from "@tanstack/react-query";

// src/query-keys.ts
function recordQueryKey(table, id) {
  return [table, id];
}
function recordListQueryKey(table, listName) {
  return [table, "list", listName];
}
function recordByIdsQueryKey(table, ids) {
  return [table, "byIds", [...ids].sort().join(",")];
}

// src/repository.ts
var Repository = class {
  constructor(config) {
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
    this.subscription = config.events$.subscribe((payload) => {
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
    });
  }
  /**
   * Get a record from cache by ID (does not fetch)
   */
  getRecordByIdFromCache(table, id) {
    if (id === null) return null;
    return this.queryClient.getQueryData(recordQueryKey(table, id));
  }
  /**
   * Create a new record
   */
  async createRecord(table, insert) {
    const response = await this.supabase.schema(this.schema).from(table).insert(insert);
    return this.throwIfError(response);
  }
  /**
   * Update an existing record
   */
  async updateRecord(table, id, update) {
    const response = await this.supabase.schema(this.schema).from(table).update(update).eq("id", id);
    return this.throwIfError(response);
  }
  /**
   * Delete a record
   */
  async deleteRecord(table, id) {
    const response = await this.supabase.schema(this.schema).from(table).delete().eq("id", id);
    return this.throwIfError(response);
  }
  /**
   * Get a single record by ID
   */
  async getRecordById(table, id) {
    const response = await this.supabase.schema(this.schema).from(table).select().eq("id", id).maybeSingle();
    return this.throwIfError(response);
  }
  /**
   * Get multiple records by IDs
   */
  async getRecordByIds(table, ids) {
    if (ids.length === 0) return [];
    const response = await this.supabase.schema(this.schema).from(table).select().in("id", ids);
    return this.throwIfError(response);
  }
  /**
   * Get records with a custom query, caching each result
   */
  async getRecords(table, query) {
    const baseQuery = this.supabase.schema(this.schema).from(table).select();
    const response = await query(baseQuery);
    const records = this.throwIfError(response);
    records.forEach((item) => {
      this.queryClient.setQueryData(recordQueryKey(table, item.id), item);
    });
    return records;
  }
  throwIfError(response) {
    if (response.error) throw response.error;
    return response.data;
  }
  /**
   * Clean up subscriptions and cache
   */
  destroy() {
    this.subscription.unsubscribe();
    this.queryClient.clear();
  }
};

// src/types.ts
function sort(key, comparable, order) {
  return { key, comparable, order };
}

// src/context.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { jsx } from "react/jsx-runtime";
function createRepositoryContext() {
  const RepositoryContext = createContext(null);
  function useRepository() {
    const context = useContext(RepositoryContext);
    if (!context) {
      throw new Error("useRepository must be used within a RepositoryProvider");
    }
    return context;
  }
  function RepositoryProvider({
    config,
    children
  }) {
    const [repository, setRepository] = useState(
      () => new Repository(config)
    );
    useEffect(() => {
      setRepository((current) => {
        current.destroy();
        return new Repository(config);
      });
    }, [config]);
    useEffect(() => {
      return () => repository.destroy();
    }, [repository]);
    return /* @__PURE__ */ jsx(QueryClientProvider, { client: repository.queryClient, children: /* @__PURE__ */ jsx(RepositoryContext.Provider, { value: repository, children }) });
  }
  return { RepositoryContext, RepositoryProvider, useRepository };
}

// src/hooks.tsx
import { useMutation, useQuery } from "@tanstack/react-query";
import compact from "lodash/compact";
import sortBy from "lodash/sortBy";
import { useEffect as useEffect2, useRef } from "react";
function useRecordById(repository, table, id) {
  return useQuery({
    queryKey: recordQueryKey(table, id ?? "null"),
    queryFn: async () => {
      if (!id) return null;
      return await repository.getRecordById(table, id);
    }
  });
}
function useRecordByIds(repository, table, ids) {
  const subscriptionRef = useRef(null);
  useEffect2(() => {
    if (ids.length === 0) return;
    const unsubscribe = repository.queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === table && ids.includes(event.query.queryKey[1])) {
        const cachedItems = ids.map((id) => repository.queryClient.getQueryData(recordQueryKey(table, id))).filter(Boolean);
        repository.queryClient.setQueryData(
          [table, "byIds", [...ids].sort().join(",")],
          cachedItems
        );
      }
    });
    subscriptionRef.current = unsubscribe;
    return unsubscribe;
  }, [table, repository, ids]);
  return useQuery({
    queryKey: [table, "byIds", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const itemMap = /* @__PURE__ */ new Map();
      const missingIds = [];
      for (const id of ids) {
        const cached = repository.queryClient.getQueryData(
          recordQueryKey(table, id)
        );
        if (cached) {
          itemMap.set(id, cached);
        } else {
          missingIds.push(id);
        }
      }
      if (missingIds.length > 0) {
        const fetchedItems = await repository.getRecordByIds(table, missingIds);
        fetchedItems.forEach((item) => {
          const itemId = item.id;
          repository.queryClient.setQueryData(recordQueryKey(table, itemId), item);
          itemMap.set(itemId, item);
        });
      }
      return compact(ids.map((id) => itemMap.get(id)));
    }
  });
}
function useRecordListQuery(repository, table, listName, options) {
  const queryKey = recordListQueryKey(table, listName);
  const query = useQuery({
    queryKey,
    queryFn: async () => await repository.getRecords(table, options.query)
  });
  useEffect2(() => {
    const unsubscribe = repository.queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === table && event.query.queryKey.length === 2) {
        if (event.type === "removed") {
          repository.queryClient.setQueryData(
            queryKey,
            (prevData) => {
              if (!prevData) return prevData;
              const index = prevData.findIndex((item) => item.id === event.query.queryKey[1]);
              if (index === -1) return prevData;
              return [...prevData.slice(0, index), ...prevData.slice(index + 1)];
            }
          );
        } else if (event.type === "updated") {
          repository.queryClient.setQueryData(
            queryKey,
            (prevData) => {
              if (!prevData) return prevData;
              const newRecord = event.action.type === "success" && event.action.data;
              if (!newRecord) return prevData;
              const map = new Map(prevData?.map((item) => [item.id, item]) ?? []);
              if (options.filter && !options.filter(newRecord)) {
                map.delete(newRecord.id);
              } else {
                map.set(newRecord.id, newRecord);
              }
              return sortBy(Array.from(map.values()), [
                (value) => {
                  const sortConfig = options.sort;
                  const sortValue = value[sortConfig.key];
                  return sortConfig.comparable(sortValue) * (sortConfig.order === "asc" ? 1 : -1);
                }
              ]);
            }
          );
        }
      }
    });
    return unsubscribe;
  }, [table, queryKey, repository, options]);
  return query;
}
function useUpdateRecord(repository, table) {
  return useMutation({
    mutationFn: async ({
      id,
      update
    }) => {
      return await repository.updateRecord(table, id, update);
    }
  });
}
function useDeleteRecord(repository, table) {
  return useMutation({
    mutationFn: async (id) => {
      return await repository.deleteRecord(table, id);
    }
  });
}

// src/realtime.ts
import { Observable } from "rxjs";
import { AnonymousSubject } from "rxjs/internal/Subject";
function createRealtimeChannel(config) {
  const observable = new Observable((subscriber) => {
    const channel = config.supabase.channel(config.channelName, {
      config: {
        private: config.isPrivate ?? false
      }
    }).on("broadcast", { event: "*" }, ({ payload }) => {
      subscriber.next(payload);
    }).subscribe();
    subscriber.add(() => {
      channel.unsubscribe();
    });
  });
  return new AnonymousSubject(void 0, observable);
}

// src/server.ts
async function prefetchRecordById(queryClient, supabase, schema, table, id) {
  return queryClient.prefetchQuery({
    queryKey: recordQueryKey(table, id),
    queryFn: async () => {
      const res = await supabase.schema(schema).from(table).select().eq("id", id).maybeSingle();
      if (res.error) throw res.error;
      return res.data;
    }
  });
}
export {
  Repository,
  createRealtimeChannel,
  createRepositoryContext,
  prefetchRecordById,
  recordByIdsQueryKey,
  recordListQueryKey,
  recordQueryKey,
  sort,
  useDeleteRecord,
  useRecordById,
  useRecordByIds,
  useRecordListQuery,
  useUpdateRecord
};
//# sourceMappingURL=index.mjs.map