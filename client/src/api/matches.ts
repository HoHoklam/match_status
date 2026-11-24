import { apiFetch } from './http';
import { MatchLiveSnapshot } from '@shared/types';

export const matchesApi = {
  getMatches: () => apiFetch<MatchLiveSnapshot[]>('/matches'),
  getLiveSnapshot: (id: string) => apiFetch<MatchLiveSnapshot>(`/matches/${id}/live`),
};
