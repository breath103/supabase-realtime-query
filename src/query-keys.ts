/**
 * Query key factory for consistent cache key generation
 */
export function recordQueryKey(table: string, id: string | number) {
  return [table, id] as const;
}

export function recordListQueryKey(table: string, listName: string) {
  return [table, "list", listName] as const;
}

export function recordByIdsQueryKey(table: string, ids: (string | number)[]) {
  return [table, "byIds", [...ids].sort().join(",")] as const;
}
