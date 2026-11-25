import { apiFetch } from './http';
import { MatchLiveSnapshot } from '@shared/types';

export const matchesApi = {
  getMatches: (signal?: AbortSignal) => apiFetch<MatchLiveSnapshot[]>('/matches', { signal, cache: 'no-store' }),
  getLiveSnapshot: (id: string) => apiFetch<MatchLiveSnapshot>(`/matches/${id}/live`),
};
