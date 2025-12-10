"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";

import { Repository, RepositoryConfig } from "./repository";
import { DatabaseSchema } from "./types";

/**
 * Create a typed repository context for your database schema
 */
export function createRepositoryContext<
  TDatabase extends DatabaseSchema,
  TSchema extends keyof TDatabase
>() {
  const RepositoryContext = createContext<Repository<TDatabase, TSchema> | null>(null);

  function useRepository(): Repository<TDatabase, TSchema> {
    const context = useContext(RepositoryContext);
    if (!context) {
      throw new Error("useRepository must be used within a RepositoryProvider");
    }
    return context;
  }

  function RepositoryProvider({
    config,
    children
  }: {
    config: RepositoryConfig<TDatabase, TSchema>;
    children: React.ReactNode;
  }) {
    const [repository, setRepository] = useState<Repository<TDatabase, TSchema>>(
      () => new Repository(config)
    );

    // Recreate repository when config changes (e.g., user changes)
    useEffect(() => {
      setRepository((current) => {
        current.destroy();
        return new Repository(config);
      });
    }, [config]);

    // Cleanup on unmount
    useEffect(() => {
      return () => repository.destroy();
    }, [repository]);

    return (
      <QueryClientProvider client={repository.queryClient}>
        <RepositoryContext.Provider value={repository}>
          {children}
        </RepositoryContext.Provider>
      </QueryClientProvider>
    );
  }

  return { RepositoryContext, RepositoryProvider, useRepository };
}
