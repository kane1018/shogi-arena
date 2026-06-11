"use client";

import { useSyncExternalStore, useCallback, useRef } from "react";
import { subscribe } from "./store";

/**
 * localStorageストアの値をReactに同期するフック。
 * getterの結果をJSON比較でキャッシュし、不要な再レンダーを防ぐ。
 * SSR時はserverFallbackを返す(マウント後にクライアント値へ切替)。
 */
export function useStoreValue<T>(getter: () => T, serverFallback: T): T {
  const getterRef = useRef(getter);
  getterRef.current = getter;
  const cache = useRef<{ json: string; value: T } | null>(null);
  const fallbackRef = useRef(serverFallback);

  const getSnapshot = useCallback(() => {
    const value = getterRef.current();
    const json = JSON.stringify(value);
    if (!cache.current || cache.current.json !== json) {
      cache.current = { json, value };
    }
    return cache.current.value;
  }, []);

  const getServerSnapshot = useCallback(() => fallbackRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** マウント済みかどうか(ローディング表示用) */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
