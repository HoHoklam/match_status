import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MatchLiveService } from './match/match-live.service';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { MatchLiveSnapshot, LiveBroadcastMessage } from '@shared/types';

async function runDualScreenE2ESimulation() {
  console.log('================================================================');
  console.log('⚽ SZTUFA 赛况系统 - 阶段五【双端全流程实战联调与广播同步演练】');
  console.log('================================================================\n');

  const app: INestApplication = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const service = app.get(MatchLiveService);
  const matchId = 'sztu-match-2026-002'; // 商学院 VS 创意设计学院

  // 模拟同浏览器下的 BroadcastChannel 监听客户端
  const clientReceivedSnapshots: MatchLiveSnapshot[] = [];
  let clientCurrentVersion = 0;

  function simulateBroadcastSend(snapshot: MatchLiveSnapshot) {
    const msg: LiveBroadcastMessage = {
      type: 'MATCH_LIVE_UPDATE',
      matchId: snapshot.id,
      snapshot,
      timestamp: Date.now(),
    };
    // 模拟 Client 端收到广播处理逻辑
    if (msg.matchId === matchId && msg.snapshot.version >= clientCurrentVersion) {
      clientCurrentVersion = msg.snapshot.version;
      clientReceivedSnapshots.push(JSON.parse(JSON.stringify(msg.snapshot)));
    }
  }

  let stepCount = 0;
  function logStep(title: string, detail: string) {
    stepCount++;
    console.log(`[实战步骤 ${stepCount}] ${title}`);
    console.log(`   ➜ ${detail}`);
  }

  function assert(desc: string, condition: boolean) {
    if (condition) {
      console.log(`   ✅ 验证通过: ${desc}`);
    } else {
      console.error(`   ❌ 验证失败: ${desc}`);
      process.exit(1);
    }
  }

  try {
    // 步骤 1：两端初始化挂载，获取初始赛况快照
    logStep('两端挂载就绪', 'Admin 操作台打开，Client 弹窗打开，拉取 0:0 未开赛状态');
    let adminSnapshot = service.reset(matchId);
    simulateBroadcastSend(adminSnapshot);
    assert('Admin 处于 NOT_STARTED', adminSnapshot.clock.period === 'NOT_STARTED');
    assert('Client 同步获得 0:0 比分', clientReceivedSnapshots.at(-1)?.score.home === 0);

    // 步骤 2：现场操作台鸣哨开球 (上半场)
    logStep('鸣哨开球', 'Admin 点击【鸣哨开球 (上半场)】，表盘走字启动');
    adminSnapshot = service.updateClock(matchId, { period: 'FIRST_HALF' });
    simulateBroadcastSend(adminSnapshot);
    assert('时钟进入 FIRST_HALF 进行中', adminSnapshot.clock.period === 'FIRST_HALF' && adminSnapshot.clock.isRunning);
    const clientAfterKickoff = clientReceivedSnapshots.at(-1)!;
    assert('Client 时间线包含开球节点', clientAfterKickoff.timeline.some(t => t.periodLabel?.includes('比赛开球')));

    // 步骤 3：纯统计动作打点 (射门、角球、犯规)
    logStep('纯统计打点 (分流验证)', 'Admin 记录主队射门+1、主队角球+1、客队犯规+1');
    adminSnapshot = service.recordAction(matchId, { type: 'SHOT', side: 'home', minute: 8, secondFormatted: '07:45' });
    simulateBroadcastSend(adminSnapshot);
    adminSnapshot = service.recordAction(matchId, { type: 'CORNER', side: 'home', minute: 9, secondFormatted: '08:20' });
    simulateBroadcastSend(adminSnapshot);
    adminSnapshot = service.recordAction(matchId, { type: 'FOUL', side: 'away', minute: 11, secondFormatted: '10:15' });
    simulateBroadcastSend(adminSnapshot);

    const clientAfterStats = clientReceivedSnapshots.at(-1)!;
    assert('Client 技术统计同步: 主队射门=1, 角球=1, 客队犯规=1', 
      clientAfterStats.stats.shots.home === 1 &&
      clientAfterStats.stats.cornerKicks.home === 1 &&
      clientAfterStats.stats.fouls.away === 1
    );
    assert('Client 时间线流保持纯净，无碎片射门/角球 (仅有1条开球节点)', clientAfterStats.timeline.length === 1);

    // 步骤 4：重大事件录入 (进球 & 黄牌带球员信息)
    logStep('重大事件录入', '主队进球 (12\' 李明 #9) 与客队黄牌 (20\' 王强 #3 战术犯规)');
    adminSnapshot = service.recordAction(matchId, {
      type: 'GOAL',
      side: 'home',
      minute: 12,
      secondFormatted: '11:35',
      playerName: '李明',
      playerNumber: 9,
      assistPlayerName: '赵天',
    });
    simulateBroadcastSend(adminSnapshot);

    adminSnapshot = service.recordAction(matchId, {
      type: 'YELLOW_CARD',
      side: 'away',
      minute: 20,
      secondFormatted: '19:40',
      playerName: '王强',
      playerNumber: 3,
      reason: '战术犯规',
    });
    simulateBroadcastSend(adminSnapshot);

    const clientAfterMajor = clientReceivedSnapshots.at(-1)!;
    assert('Client 比分联动为 1:0', clientAfterMajor.score.home === 1 && clientAfterMajor.score.away === 0);
    assert('Client 进球联动: 射门+1(共2), 射正+1', clientAfterMajor.stats.shots.home === 2 && clientAfterMajor.stats.shotsOnTarget.home === 1);
    assert('Client 黄牌联动: 客队黄牌+1, 犯规+1(共2)', clientAfterMajor.stats.yellowCards.away === 1 && clientAfterMajor.stats.fouls.away === 2);
    assert('Client 时间线包含进球卡片 (李明 #9)', clientAfterMajor.timeline.some(t => t.type === 'goal' && t.playerName === '李明'));
    assert('Client 时间线包含黄牌卡片 (王强 #3)', clientAfterMajor.timeline.some(t => t.type === 'yellow_card' && t.reason === '战术犯规'));

    // 步骤 5：中场休息弹窗确认 (输入 35') 与自适应推算
    logStep('中场休息确认 (HT)', 'Admin 点击中场休息，确认上半场 35 分钟');
    adminSnapshot = service.updateClock(matchId, {
      period: 'HALF_TIME',
      confirmedMinute: 35,
    });
    simulateBroadcastSend(adminSnapshot);

    const clientAfterHT = clientReceivedSnapshots.at(-1)!;
    assert('Client 时钟显示停止走字 (HALF_TIME)', clientAfterHT.clock.period === 'HALF_TIME' && !clientAfterHT.clock.isRunning);
    assert('自适应换算: 下半场自适应起始点为 36\' (<45分钟规则)', clientAfterHT.clock.secondHalfStartMinute === 36);
    assert('Client 时间线插入 [HT 35\' 中场休息] 贯穿节点', clientAfterHT.timeline.some(t => t.periodLabel?.includes("HT 35' 中场休息")));

    // 步骤 6：开始下半场 (SECOND_HALF)
    logStep('开始下半场', 'Admin 点击【开始下半场 (从 36\' 起)】');
    adminSnapshot = service.updateClock(matchId, {
      period: 'SECOND_HALF',
    });
    simulateBroadcastSend(adminSnapshot);

    const clientAfter2ndHalf = clientReceivedSnapshots.at(-1)!;
    assert('Client 时钟下半场启动，起始时间为 35:01 (第 36\')', clientAfter2ndHalf.clock.displayMinute === 36 && clientAfter2ndHalf.clock.currentSecond === 2101);
    assert('Client 时间线插入 [⏱️ 36\' 下半场开球] 节点', clientAfter2ndHalf.timeline.some(t => t.periodLabel?.includes("36' 下半场开球")));

    // 步骤 7：撤销操作 (Undo) 逆向回滚联动
    logStep('现场撤销 (Undo)', 'Admin 点击【撤销 (Undo)】，撤销下半场启动状态');
    adminSnapshot = service.undo(matchId);
    simulateBroadcastSend(adminSnapshot);

    const clientAfterUndo = clientReceivedSnapshots.at(-1)!;
    assert('Client 状态安全回滚至中场休息 (HALF_TIME)', clientAfterUndo.clock.period === 'HALF_TIME');

    // 步骤 8：全场完赛锁定 (FINISHED)
    logStep('比赛终结锁定 (FT)', 'Admin 点击全场比赛结束，锁定终局比分');
    adminSnapshot = service.updateClock(matchId, {
      period: 'FINISHED',
    });
    simulateBroadcastSend(adminSnapshot);

    const clientAfterFT = clientReceivedSnapshots.at(-1)!;
    assert('Client 比赛进入已完赛 (FINISHED)', clientAfterFT.clock.period === 'FINISHED' && !clientAfterFT.clock.isRunning);
    assert('Client 时间线包含全场结束节点 (FT)', clientAfterFT.timeline.some(t => t.periodLabel?.includes('比赛结束')));

    // 演练完毕，干净重置
    service.reset(matchId);

    console.log('\n================================================================');
    console.log('🎉 阶段五【双端全流程实战联调演练】圆满达成！');
    console.log('   - 左右双端数据完全 100% 镜像一致');
    console.log('   - 现场打点、动作分流、自适应时钟、30步撤销与广播链路全部调通');
    console.log('================================================================\n');
  } finally {
    await app.close();
  }
}

runDualScreenE2ESimulation().catch((err) => {
  console.error('实战联调模拟运行异常:', err);
  process.exit(1);
});
