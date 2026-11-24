import { MatchLiveSnapshot } from './types';

/**
 * 深圳技术大学足球协会 (SZTUFA) 杯赛测试预设数据
 * 预置对局：中德制造学院 VS 大数据与互联网学院
 */
export const INITIAL_MOCK_MATCH: MatchLiveSnapshot = {
  id: 'sztu-match-2026-001',
  title: '2026年深圳技术大学“院长杯”足球超级联赛 第3轮',
  competitionName: '深技大院长杯 2026',
  venue: '深圳技术大学北区体育场（1号场）',
  homeTeam: {
    id: 'team-zd',
    name: '中德制造学院足球队',
    shortName: '中德制造',
    college: '中德智能制造学院',
    primaryColor: '#1A56DB',
  },
  awayTeam: {
    id: 'team-ds',
    name: '大数据与互联网学院足球队',
    shortName: '大数据',
    college: '大数据与互联网学院',
    primaryColor: '#0EA5E9',
  },
  score: {
    home: 2,
    away: 1,
  },
  clock: {
    period: 'FIRST_HALF',
    isRunning: true,
    currentSecond: 2180, // 36分20秒
    displayMinute: 37,
    displayTime: '36:20',
    halfTimeMinute: null,
    secondHalfStartMinute: 36,
    lastStartedAt: Date.now() - 2180 * 1000,
  },
  possessionSide: 'home',
  stats: {
    possession: {
      home: 56,
      away: 44,
      homeSeconds: 1220,
      awaySeconds: 960,
    },
    shots: {
      home: 11,
      away: 20,
    },
    shotsOnTarget: {
      home: 3,
      away: 4,
    },
    cornerKicks: {
      home: 2,
      away: 5,
    },
    freeKicks: {
      home: 8,
      away: 21,
    },
    fouls: {
      home: 21,
      away: 8,
    },
    yellowCards: {
      home: 4,
      away: 2,
    },
    redCards: {
      home: 0,
      away: 0,
    },
  },
  timeline: [
    {
      id: 'evt-001',
      matchId: 'sztu-match-2026-001',
      type: 'goal',
      side: 'home',
      minute: 12,
      period: 'FIRST_HALF',
      secondFormatted: '11:45',
      playerName: '陈思源',
      playerNumber: 9,
      assistPlayerName: '林浩轩',
      createdAt: Date.now() - 1475 * 1000,
    },
    {
      id: 'evt-002',
      matchId: 'sztu-match-2026-001',
      type: 'yellow_card',
      side: 'away',
      minute: 22,
      secondFormatted: '21:10',
      playerName: '黄嘉伟',
      playerNumber: 4,
      reason: '中场战术犯规',
      createdAt: Date.now() - 910 * 1000,
    },
    {
      id: 'evt-003',
      matchId: 'sztu-match-2026-001',
      type: 'goal',
      side: 'away',
      minute: 28,
      secondFormatted: '27:32',
      playerName: '王瑞泽',
      playerNumber: 10,
      createdAt: Date.now() - 528 * 1000,
    },
    {
      id: 'evt-004',
      matchId: 'sztu-match-2026-001',
      type: 'yellow_card',
      side: 'home',
      minute: 31,
      secondFormatted: '30:15',
      playerName: '刘冠宇',
      playerNumber: 6,
      reason: '禁区前沿推人',
      createdAt: Date.now() - 365 * 1000,
    },
    {
      id: 'evt-005',
      matchId: 'sztu-match-2026-001',
      type: 'goal',
      side: 'home',
      minute: 35,
      secondFormatted: '34:50',
      playerName: '陈思源',
      playerNumber: 9,
      assistPlayerName: '张天霖',
      createdAt: Date.now() - 90 * 1000,
    },
  ],
  updatedAt: Date.now(),
  version: 6,
};

/** 预设备选比赛列表 */
export const MOCK_MATCH_LIST = [
  INITIAL_MOCK_MATCH,
  {
    ...INITIAL_MOCK_MATCH,
    id: 'sztu-match-2026-002',
    title: '2026年深圳技术大学“院长杯”足球超级联赛 第3轮',
    homeTeam: {
      id: 'team-sy',
      name: '商学院足球队',
      shortName: '商学院',
      college: '商学院',
      primaryColor: '#10B981',
    },
    awayTeam: {
      id: 'team-cy',
      name: '创意设计学院足球队',
      shortName: '创意设计',
      college: '创意设计学院',
      primaryColor: '#F59E0B',
    },
    score: { home: 0, away: 0 },
    clock: {
      period: 'NOT_STARTED',
      isRunning: false,
      currentSecond: 0,
      displayMinute: 0,
      displayTime: '00:00',
      halfTimeMinute: null,
      secondHalfStartMinute: 36,
      lastStartedAt: null,
    },
    possessionSide: 'neutral',
    stats: {
      possession: { home: 50, away: 50, homeSeconds: 0, awaySeconds: 0 },
      shots: { home: 0, away: 0 },
      shotsOnTarget: { home: 0, away: 0 },
      cornerKicks: { home: 0, away: 0 },
      freeKicks: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
    },
    timeline: [],
    version: 0,
  },
];
