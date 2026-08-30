import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

export interface UseInfiniteScrollOptions {
  initialBatchSize?: number;
  batchSize?: number;
  rootMargin?: string;
  threshold?: number;
  delayMs?: number;
}

export interface UseInfiniteScrollResult<T> {
  visibleItems: T[];
  displayedCount: number;
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  loadMore: () => void;
  loadAll: () => void;
  progressPercentage: number;
}

export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult<T> {
  const {
    initialBatchSize = 12,
    batchSize = 8,
    rootMargin = '250px',
    threshold = 0.1,
    delayMs = 200,
  } = options;

  const [displayedCount, setDisplayedCount] = useState<number>(() =>
    Math.min(items.length, initialBatchSize)
  );
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset count whenever input items change (e.g. filter/search/sort change)
  useEffect(() => {
    setDisplayedCount(Math.min(items.length, initialBatchSize));
    setIsLoadingMore(false);
  }, [items, initialBatchSize]);

  const hasMore = displayedCount < items.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(items.length, prev + batchSize));
      setIsLoadingMore(false);
    }, delayMs);
  }, [hasMore, isLoadingMore, items.length, batchSize, delayMs]);

  const loadAll = useCallback(() => {
    setDisplayedCount(items.length);
  }, [items.length]);

  // Setup Intersection Observer on the sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, rootMargin, threshold]);

  const visibleItems: T[] = items.slice(0, displayedCount);

  return {
    visibleItems,
    displayedCount,
    totalCount: items.length,
    hasMore,
    isLoadingMore,
    sentinelRef,
    loadMore,
    loadAll,
    progressPercentage: items.length > 0 ? Math.round((displayedCount / items.length) * 100) : 100,
  };
}
