import { request } from './http';
import {
  MatchLiveSnapshot,
  SubmitLiveActionDto,
  ChangeClockPeriodDto,
  SwitchPossessionDto,
  UpdateStatsDeltaDto,
  CreateMatchDto,
} from '@shared/types';

export const matchLiveService = {
  getMatches: () => request<MatchLiveSnapshot[]>('/matches'),
  createMatch: (dto: CreateMatchDto) =>
    request<MatchLiveSnapshot>('/matches', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateMatch: (id: string, dto: CreateMatchDto) =>
    request<MatchLiveSnapshot>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  deleteMatch: (id: string) =>
    request<{ success: boolean; id: string }>(`/matches/${id}`, {
      method: 'DELETE',
    }),
  getLiveSnapshot: (id: string) => request<MatchLiveSnapshot>(`/matches/${id}/live`),
  updateClock: (id: string, dto: ChangeClockPeriodDto) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/clock`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  switchPossession: (id: string, dto: SwitchPossessionDto) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/possession`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  recordAction: (id: string, dto: SubmitLiveActionDto) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/action`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateStatsDelta: (id: string, dto: UpdateStatsDeltaDto) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/stats`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  updatePenaltyShootout: (id: string, dto: any) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/penalty-shootout`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  deleteTimelineEvent: (id: string, eventId: string) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/events/${eventId}`, {
      method: 'DELETE',
    }),
  undo: (id: string) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/undo`, {
      method: 'POST',
    }),
  reset: (id: string) =>
    request<MatchLiveSnapshot>(`/matches/${id}/live/reset`, {
      method: 'POST',
    }),
};
