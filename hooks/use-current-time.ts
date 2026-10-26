'use client';

import { useSyncExternalStore } from 'react';

// Single module-level cached timestamp to guarantee getSnapshot() returns
// the identical reference/number across all renders until notify() fires.
let cachedTime: number = 0;
const subscribers = new Set<() => void>();
let timerId: ReturnType<typeof setInterval> | null = null;

function notify() {
  cachedTime = Date.now();
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  if (subscribers.size === 1) {
    if (typeof window !== 'undefined') {
      cachedTime = Date.now();
    }
    timerId = setInterval(notify, 5000);
  }
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };
}

function getSnapshot(): number {
  if (cachedTime === 0 && typeof window !== 'undefined') {
    cachedTime = Date.now();
  }
  return cachedTime;
}

function getServerSnapshot(): number {
  return 0;
}

export function useCurrentTimestamp(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
