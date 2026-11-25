import { MatchLiveService } from './match/match-live.service';
import { LocalMatchStore } from './match/storage/local-match-store';
import { PenaltyShootoutState } from '@shared/types';

function runPenaltyTests() {
  console.log('====================================================');
  console.log('⚽ 点球大战与完赛持久化自动化专项测试');
  console.log('====================================================');

  const service = new MatchLiveService();
  const matches = service.getMatches();
  const matchId = matches.length > 0 ? matches[0].id : 'test-match-1';
  console.log(`正在针对比赛 [${matchId}] 运行测试...`);

  service.reset(matchId);
  service.updateClock(matchId, { period: 'FIRST_HALF' });
  service.updateClock(matchId, { period: 'HALF_TIME' });
  service.updateClock(matchId, { period: 'SECOND_HALF' });
  service.updateClock(matchId, { period: 'PAUSED', regularTimeEnded: true });

  // 2. 更新点球大战状态
  const shootoutState: PenaltyShootoutState = {
    enabled: true,
    homeScore: 2,
    awayScore: 4,
    winnerSide: 'away',
    roundsCount: 5,
    homeKicks: [
      { round: 1, side: 'home', playerName: '洪奕壕', scored: false, scoreAfterKick: '0-1' },
      { round: 2, side: 'home', playerName: '李浪', scored: true, scoreAfterKick: '1-2' },
      { round: 3, side: 'home', playerName: '吴炫毅', scored: true, scoreAfterKick: '2-2' },
      { round: 4, side: 'home', playerName: '吴天睿', scored: false, scoreAfterKick: '2-3' },
    ],
    awayKicks: [
      { round: 1, side: 'away', playerName: '蔡卓钦', scored: true, scoreAfterKick: '0-1' },
      { round: 2, side: 'away', playerName: '王志佳', scored: true, scoreAfterKick: '0-2' },
      { round: 3, side: 'away', playerName: '周昀昊', scored: false, scoreAfterKick: '1-2' },
      { round: 4, side: 'away', playerName: '郭翰文', scored: true, scoreAfterKick: '2-3' },
      { round: 5, side: 'away', playerName: '幸弘历', scored: true, scoreAfterKick: '2-4' },
    ],
    isCompleted: false,
  };

  const updatedShootout = service.updatePenaltyShootout(matchId, shootoutState);
  if (!updatedShootout.penaltyShootout) throw new Error('penaltyShootout 写入失败');
  if (updatedShootout.penaltyShootout.homeScore !== 2 || updatedShootout.penaltyShootout.awayScore !== 4) {
    throw new Error('点球比分计算不匹配');
  }
  console.log('✅ [PASS] 点球大战更新成功，比分 2:4，胜方为 away');

  // 3. 点击“全场比赛结束”锁定终局比分
  const finishedMatch = service.updateClock(matchId, {
    period: 'FINISHED',
    penaltyShootout: {
      ...shootoutState,
      isCompleted: true,
    },
  });

  if (finishedMatch.clock.period !== 'FINISHED') throw new Error('比赛状态未变更为 FINISHED');
  if (!finishedMatch.penaltyShootout?.isCompleted) throw new Error('点球完赛标记未正确锁定');
  console.log('✅ [PASS] 全场比赛完赛锁定，点球数据持久化保留');

  // 4. 从存储重新读取
  const reloaded = service.getLiveSnapshot(matchId);
  if (reloaded.penaltyShootout?.awayScore !== 4) throw new Error('本地持久化重载失败');
  console.log('✅ [PASS] 本地持久化重载校验通过，点球终局数据一致');

  console.log('====================================================');
  console.log('🎯 点球大战专项测试全部通过！');
  console.log('====================================================');
}

runPenaltyTests();
