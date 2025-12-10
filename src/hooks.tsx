/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import compact from "lodash/compact";
import sortBy from "lodash/sortBy";
import { useEffect, useRef } from "react";

import { recordListQueryKey, recordQueryKey } from "./query-keys";
import { FilterBuilder, Repository } from "./repository";
import { DatabaseSchema, Sort, TableNames, TableRow, TableUpdate } from "./types";

/**
 * Hook to get a single record by ID with realtime updates
 */
export function useRecordById<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
>(
  repository: Repository<TDatabase, TSchema>,
  table: TTable,
  id: TableRow<TDatabase, TSchema, TTable>["id"] | null
) {
  return useQuery({
    queryKey: recordQueryKey(table, id ?? "null"),
    queryFn: async () => {
      if (!id) return null;
      return await repository.getRecordById(table, id);
    }
  });
}

/**
 * Hook to get multiple records by IDs with realtime updates
 */
export function useRecordByIds<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
>(
  repository: Repository<TDatabase, TSchema>,
  table: TTable,
  ids: TableRow<TDatabase, TSchema, TTable>["id"][]
) {
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;

    const unsubscribe = repository.queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === table && ids.includes(event.query.queryKey[1] as any)) {
        const cachedItems = ids
          .map(id => repository.queryClient.getQueryData(recordQueryKey(table, id)))
          .filter(Boolean) as TableRow<TDatabase, TSchema, TTable>[];

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

      const itemMap = new Map<any, TableRow<TDatabase, TSchema, TTable>>();
      const missingIds: any[] = [];

      for (const id of ids) {
        const cached = repository.queryClient.getQueryData(
          recordQueryKey(table, id)
        ) as TableRow<TDatabase, TSchema, TTable> | undefined;
        if (cached) {
          itemMap.set(id, cached);
        } else {
          missingIds.push(id);
        }
      }

      if (missingIds.length > 0) {
        const fetchedItems = await repository.getRecordByIds(table, missingIds);
        fetchedItems.forEach((item) => {
          const itemId = (item as any).id;
          repository.queryClient.setQueryData(recordQueryKey(table, itemId), item);
          itemMap.set(itemId, item);
        });
      }

      return compact(ids.map(id => itemMap.get(id)!));
    }
  });
}

/**
 * Hook to get a list of records with custom query, sorting, and filtering
 */
export function useRecordListQuery<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
>(
  repository: Repository<TDatabase, TSchema>,
  table: TTable,
  listName: string,
  options: {
    query: (filter: FilterBuilder<TDatabase, TSchema, TTable>) => FilterBuilder<TDatabase, TSchema, TTable>;
    sort: Sort<TableRow<TDatabase, TSchema, TTable>, any>;
    filter?: (item: TableRow<TDatabase, TSchema, TTable>) => boolean;
  }
) {
  const queryKey = recordListQueryKey(table, listName);

  const query = useQuery({
    queryKey: queryKey,
    queryFn: async () => await repository.getRecords(table, options.query)
  });

  useEffect(() => {
    const unsubscribe = repository.queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === table && event.query.queryKey.length === 2) {
        if (event.type === "removed") {
          repository.queryClient.setQueryData(
            queryKey,
            (prevData: TableRow<TDatabase, TSchema, TTable>[] | undefined) => {
              if (!prevData) return prevData;
              const index = prevData.findIndex(item => item.id === event.query.queryKey[1]);
              if (index === -1) return prevData;
              return [...prevData.slice(0, index), ...prevData.slice(index + 1)];
            }
          );
        } else if (event.type === "updated") {
          repository.queryClient.setQueryData(
            queryKey,
            (prevData: TableRow<TDatabase, TSchema, TTable>[] | undefined) => {
              if (!prevData) return prevData;

              const newRecord = event.action.type === "success" && event.action.data;
              if (!newRecord) return prevData;

              const map = new Map(prevData?.map(item => [item.id, item]) ?? []);
              if (options.filter && !options.filter(newRecord as any)) {
                map.delete((newRecord as any).id);
              } else {
                map.set((newRecord as any).id, newRecord as any);
              }

              return sortBy(Array.from(map.values()), [
                (value) => {
                  const sortConfig = options.sort;
                  const sortValue = value[sortConfig.key as keyof typeof value];
                  return sortConfig.comparable(sortValue as any) * (sortConfig.order === "asc" ? 1 : -1);
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

/**
 * Hook to update a record
 */
export function useUpdateRecord<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
>(repository: Repository<TDatabase, TSchema>, table: TTable) {
  return useMutation({
    mutationFn: async ({
      id,
      update
    }: {
      id: TableRow<TDatabase, TSchema, TTable>["id"];
      update: Partial<TableUpdate<TDatabase, TSchema, TTable>>;
    }) => {
      return await repository.updateRecord(table, id, update);
    }
  });
}

/**
 * Hook to delete a record
 */
export function useDeleteRecord<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase,
  TTable extends TableNames<TDatabase, TSchema>
>(repository: Repository<TDatabase, TSchema>, table: TTable) {
  return useMutation({
    mutationFn: async (id: TableRow<TDatabase, TSchema, TTable>["id"]) => {
      return await repository.deleteRecord(table, id);
    }
  });
}
