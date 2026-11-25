import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchLiveSnapshot } from '@shared/types';
import { matchesApi } from '../api/matches';

export function useLiveMatches() {
  const [matches, setMatches] = useState<MatchLiveSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const active = useRef<AbortController | null>(null);

  const refresh = useCallback(async (manual = false) => {
    if (active.current && !manual) return;
    active.current?.abort();
    const request = new AbortController();
    active.current = request;
    if (manual) setRefreshing(true);
    const timeout = setTimeout(() => request.abort(), 8000);
    try {
      const list = await matchesApi.getMatches(request.signal);
      if (active.current !== request) return;
      setMatches(previous => {
        const byId = new Map(previous.map(match => [match.id, match]));
        return list.map(match => {
          const old = byId.get(match.id);
          return old && old.version > match.version ? old : match;
        });
      });
      setError(false);
    } catch {
      if (active.current === request) setError(true);
    } finally {
      clearTimeout(timeout);
      if (active.current === request) {
        active.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      clearInterval(timer);
      active.current?.abort();
      active.current = null;
    };
  }, [refresh]);

  return { matches, loading, refreshing, error, refresh };
}
