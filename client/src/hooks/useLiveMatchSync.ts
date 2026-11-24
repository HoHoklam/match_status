import { useState, useEffect, useRef } from 'react';
import { MatchLiveSnapshot, LiveBroadcastMessage } from '@shared/types';
import { matchesApi } from '../api/matches';

export function useLiveMatchSync(matchId: string) {
  const [data, setData] = useState<MatchLiveSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const currentVersionRef = useRef<number>(0);

  const fetchLive = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await matchesApi.getLiveSnapshot(matchId);
      if (res.version >= currentVersionRef.current) {
        currentVersionRef.current = res.version;
        setData(res);
      }
      setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(err.message || '获取赛况失败');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    currentVersionRef.current = 0;
    fetchLive(false);

    // 1. 3s 兜底轮询
    const pollInterval = setInterval(() => {
      fetchLive(true);
    }, 3000);

    // 2. BroadcastChannel 同浏览器 0ms 广播瞬时监听
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('sztufa_live_bus');
      channel.onmessage = (event: MessageEvent<LiveBroadcastMessage>) => {
        if (event.data && event.data.matchId === matchId && event.data.snapshot) {
          const snapshot = event.data.snapshot;
          if (snapshot.version >= currentVersionRef.current) {
            currentVersionRef.current = snapshot.version;
            setData(snapshot);
          }
        }
      };
    } catch {
      // 浏览器若不支持 BroadcastChannel 则纯依赖轮询
    }

    return () => {
      clearInterval(pollInterval);
      channel?.close();
    };
  }, [matchId]);

  return { data, loading, error, refresh: () => fetchLive(false) };
}
