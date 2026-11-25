/**
 * 足球赛况系统 - 共享契约与类型定义
 * 包含 8 项核心统计模型、时钟状态机、关键时间线事件与接口载荷定义
 */

/** 比赛阶段状态枚举 */
export type MatchPeriod =
  | 'NOT_STARTED'  // 未开赛
  | 'FIRST_HALF'   // 上半场
  | 'HALF_TIME'    // 中场休息
  | 'SECOND_HALF'  // 下半场
  | 'FINISHED'     // 比赛结束
  | 'PAUSED';      // 暂停走时

export type PlayingHalf = 'FIRST_HALF' | 'SECOND_HALF';

/** 控球方定义 */
export type PossessionSide = 'home' | 'away' | 'neutral';

/** 比赛时钟灵活模型 */
export interface MatchClockState {
  period: MatchPeriod;
  isRunning: boolean;            // 是否处于走时状态
  currentSecond: number;         // 比赛累计实际秒数（例如 2180 秒）
  displayMinute: number;         // 盘面显示分钟（例如 37'）
  displayTime: string;           // 格式化表盘显示时间（例如 "36:20"）
  halfTimeMinute: number | null; // 上半场最终结算确认分钟（例如 35 或 45）
  secondHalfStartMinute: number; // 下半场自适应起始分钟（若上半场确认35'则为36'；若45'则为46'）
  lastStartedAt: number | null;  // 最近一次启动走时的毫秒时间戳（用于服务端/客户端对齐走时）
  anchorAt?: number;
  announcedStoppage?: Partial<Record<PlayingHalf, number>>;
  regularTimeEnded?: boolean;
  previousPeriod?: MatchPeriod | null; // 暂停前的半场状态 (FIRST_HALF 或 SECOND_HALF)
}

/** 核心 8 项技术统计模型 (主客双向) */
export interface MatchStatistics {
  possession: {
    home: number;        // 主队控球率百分比 (0-100)
    away: number;        // 客队控球率百分比 (0-100)
    homeSeconds: number; // 主队持球累计秒数
    awaySeconds: number; // 客队持球累计秒数
  };
  shots: {
    home: number;        // 射门总数
    away: number;
  };
  shotsOnTarget: {
    home: number;        // 射正次数
    away: number;
  };
  cornerKicks: {
    home: number;        // 角球次数
    away: number;
  };
  freeKicks: {
    home: number;        // 任意球次数
    away: number;
  };
  fouls: {
    home: number;        // 犯规次数
    away: number;
  };
  yellowCards: {
    home: number;        // 黄牌数量
    away: number;
  };
  redCards: {
    home: number;        // 红牌数量
    away: number;
  };
}

/** 进球细分类型 (普通进球 / 点球进球 / 点球未进 / 乌龙球) */
export type GoalType = 'regular' | 'penalty' | 'penalty_missed' | 'own_goal';

/** 时间线事件类型（仅重大事件与时段节点） */
export type TimelineEventType =
  | 'goal'             // 进球 ⚽
  | 'penalty_goal'     // 点球罚进 🎯 (兼容旧数据)
  | 'penalty_missed'   // 点球未进 ❌ (兼容旧数据)
  | 'own_goal'         // 乌龙球 🥅 (兼容旧数据)
  | 'yellow_card'      // 黄牌 🟨
  | 'red_card'         // 红牌 🟥
  | 'substitution'     // 换人 🔄
  | 'period_node';     // 时段节点（开球 ⏱️、中场休息 HT、全场结束 FT）

/** 关键时间线事件条目 */
export interface MatchTimelineEvent {
  id: string;
  matchId: string;
  type: TimelineEventType;
  goalType?: GoalType;          // 进球细分类型 (regular / penalty / penalty_missed / own_goal)
  side: 'home' | 'away' | 'neutral';
  minute: number;               // 发生比赛分钟 (如 37)
  period?: MatchPeriod;         // 归属比赛阶段 (如 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED')
  secondFormatted?: string;     // 具体发生时间点 (如 "36:20")
  createdAt: number;            // 提交时间戳
  
  // 详情字段
  playerName?: string;          // 当事球员姓名 (如 "张三")
  playerNumber?: number;        // 球员号码 (如 10)
  assistPlayerName?: string;    // 助攻球员 (进球专属)
  subOutPlayerName?: string;    // 换下球员 (换人专属)
  subInPlayerName?: string;     // 换上球员 (换人专属)
  reason?: string;              // 出牌原因 (如 "战术犯规")
  periodLabel?: string;         // 时段节点标识 (如 "HT 35' 中场休息", "FT 70' 比赛结束")
  displayMinuteFormatted?: string; // 格式化分钟 (如 "45+1'", "90+2'", "37'")
}

/** 球员信息模型 */
export interface PlayerInfo {
  id?: string;
  number: number;
  name: string;
}

/** 球队简要信息 */
export interface MatchTeamInfo {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  college?: string;             // 深圳技术大学所属学院
  primaryColor?: string;        // 球队主色 (支持输入文本，如“红色”)
  starters?: PlayerInfo[];      // 首发名单 (8人制8名 / 11人制11名)
  substitutes?: PlayerInfo[];   // 替补名单
}

/** 单次点球记录 */
export interface PenaltyKickRecord {
  round: number;          // 轮次 (1, 2, 3...)
  side: 'home' | 'away';  // 踢球方
  playerName: string;     // 罚球队员姓名
  playerNumber?: number;  // 球员号码
  scored: boolean;        // 是否罚进
  status?: 'scored' | 'missed'; // 明确的主罚状态 ('scored' | 'missed'，未踢时为 undefined)
  isAttempted?: boolean;  // 是否已主罚
  scoreAfterKick?: string; // 罚完本球后的点球大比分，如 "0-1", "1-2"
}

/** 点球大战全量信息模型 */
export interface PenaltyShootoutState {
  enabled: boolean;             // 是否进入点球大战
  homeScore: number;            // 主队点球得分
  awayScore: number;            // 客队点球得分
  winnerSide?: 'home' | 'away' | null; // 人为确认的最终胜方
  roundsCount: number;          // 当前总轮次（默认5轮，可追加）
  homeKicks: PenaltyKickRecord[]; // 主队点球记录
  awayKicks: PenaltyKickRecord[]; // 客队点球记录
  isCompleted?: boolean;        // 点球大战是否已结束
  firstKickSide?: 'home' | 'away' | null; // 先罚球方 ('home' | 'away')
}

/** 比赛全量实时状态快照模型 (用于客户端拉取与广播传输) */
export interface MatchLiveSnapshot {
  id: string;
  title: string;                // 如 "2026深技大院长杯小组赛 A组第2轮"
  competitionName: string;
  venue: string;                // 如 "SZTU 北区足球场"
  matchType?: '8_aside' | '11_aside'; // 赛制 (8人制 / 11人制)
  halfDuration?: number;        // 半场常规时长 (如 45)
  fullDuration?: number;        // 全场常规时长 (如 90)
  kickoffTime?: string | null;  // 鸣哨开球时间 (如 "2026-10-15 16:50")
  homeTeam: MatchTeamInfo;
  awayTeam: MatchTeamInfo;
  score: {
    home: number;
    away: number;
  };
  clock: MatchClockState;
  possessionSide: PossessionSide;
  stats: MatchStatistics;
  timeline: MatchTimelineEvent[];
  penaltyShootout?: PenaltyShootoutState;
  updatedAt: number;
  version: number;              // 乐观自增版本号
}

/** 现场动作提交载荷 (Admin -> Server) */
export type LiveActionType =
  // 重大事件（写入时间线 + 联动统计）
  | 'GOAL'
  | 'PENALTY'
  | 'OWN_GOAL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  // 纯技术统计事件（仅联动统计，不刷屏时间线）
  | 'SHOT'
  | 'SHOT_ON_TARGET'
  | 'CORNER'
  | 'FREE_KICK'
  | 'FOUL';

export interface SubmitLiveActionDto {
  expectedVersion?: number;
  type: LiveActionType;
  side: 'home' | 'away';
  goalType?: GoalType;          // 进球细分类型 (regular / penalty / penalty_missed / own_goal)
  minute?: number;
  secondFormatted?: string;     // 具体发生时间点 (如 "36:20")
  playerName?: string;
  playerNumber?: number;
  assistPlayerName?: string;
  subInPlayerName?: string;
  subOutPlayerName?: string;
  reason?: string;
  isShotOnTarget?: boolean;     // 记录射门时是否同时勾选射正
  penaltyScored?: boolean;      // 常规时间点球是否罚进 (true: 罚进; false: 未进)
}

/** 时钟切换载荷 */
export interface ChangeClockPeriodDto {
  period: MatchPeriod;
  confirmedMinute?: number;      // 中场确认或手动调整时的分钟
  expectedVersion?: number;
  regularTimeEnded?: boolean;
  resetSecond?: number;          // 强制重置秒数
  currentSecond?: number;        // 当前走时秒数
  displayTime?: string;          // 盘面显示格式化时间 (如 "36:20")
  penaltyShootout?: PenaltyShootoutState | null; // 完赛时附带的点球大战数据 (传 null 表示清除/未进行点球)
}

/** 点球大战更新载荷 */
export interface UpdatePenaltyShootoutDto {
  enabled?: boolean;
  homeScore: number;
  awayScore: number;
  winnerSide?: 'home' | 'away' | null;
  roundsCount: number;
  homeKicks: PenaltyKickRecord[];
  awayKicks: PenaltyKickRecord[];
  isCompleted?: boolean;
  firstKickSide?: 'home' | 'away' | null;
}

/** 控球方切换载荷 */
export interface SwitchPossessionDto {
  side: PossessionSide;
  homeSeconds?: number;          // 主队持球秒数校准
  awaySeconds?: number;          // 客队持球秒数校准
  currentSecond?: number;        // 当前走时秒数
  displayTime?: string;          // 盘面显示格式化时间 (如 "36:20")
  displayMinute?: number;        // 盘面显示比赛分钟
}

/** 统计项手动微调载荷 */
export interface UpdateStatsDeltaDto {
  statKey: keyof Omit<MatchStatistics, 'possession'>;
  side: 'home' | 'away';
  delta: number;                 // +1 或 -1
}

/** 创建/编辑比赛载荷 (Admin -> Server) */
export interface CreateMatchDto {
  title: string;
  competitionName: string;
  venue: string;
  matchType: '8_aside' | '11_aside';
  halfDuration?: number;        // 半场常规时长 (如 45)
  fullDuration?: number;        // 全场常规时长 (如 90)
  homeTeam: {
    name: string;
    shortName?: string;
    college?: string;
    primaryColor: string;
    starters: PlayerInfo[];
    substitutes?: PlayerInfo[];
  };
  awayTeam: {
    name: string;
    shortName?: string;
    college?: string;
    primaryColor: string;
    starters: PlayerInfo[];
    substitutes?: PlayerInfo[];
  };
}

export type UpdateMatchDto = CreateMatchDto;

/** 广播总线消息结构 */
export interface LiveBroadcastMessage {
  type: 'MATCH_LIVE_UPDATE' | 'ACTION_RECORDED' | 'CLOCK_TICK' | 'MATCH_CREATED' | 'MATCH_DELETED';
  matchId: string;
  snapshot?: MatchLiveSnapshot;
  timestamp: number;
}
