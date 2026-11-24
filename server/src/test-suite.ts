import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MatchLiveService } from './match/match-live.service';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function runTestSuite() {
  console.log('====================================================');
  console.log('⚽ SZTUFA 足球赛况轻量系统 - 阶段二后端状态机深度验证');
  console.log('====================================================\n');

  const app: INestApplication = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const service = app.get(MatchLiveService);
  const matches = service.getMatches();
  let testMatchId = 'sztu-match-2026-002';
  if (!matches.some(m => m.id === testMatchId)) {
    if (matches.length > 0) {
      testMatchId = matches[0].id;
    } else {
      const created = service.createMatch({
        title: '测试杯赛',
        competitionName: '深技大院长杯',
        venue: 'SZTU 足球场',
        matchType: '8_aside',
        halfDuration: 20,
        fullDuration: 40,
        homeTeam: { name: '人工智能', primaryColor: '#1a56db', starters: [] },
        awayTeam: { name: '中德', primaryColor: '#ef4444', starters: [] },
      });
      testMatchId = created.id;
    }
  }

  let passedCount = 0;
  let totalCount = 0;

  function assert(desc: string, condition: boolean, details?: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      if (details) {
        console.error(`     原因: ${details}`);
      }
    }
  }

  try {
    // ----------------------------------------------------
    // 测试组 1：数据读取与重置基线
    // ----------------------------------------------------
    console.log('【测试组 1】数据读取与基线重置');
    const resetMatch = service.reset(testMatchId);
    assert('重置比赛为初始 NOT_STARTED 状态', resetMatch.clock.period === 'NOT_STARTED');
    assert('初始比分为 0:0', resetMatch.score.home === 0 && resetMatch.score.away === 0);
    assert('初始时间线为空', resetMatch.timeline.length === 0);
    assert('所有 8 项统计均为 0', 
      resetMatch.stats.shots.home === 0 && 
      resetMatch.stats.shotsOnTarget.home === 0 &&
      resetMatch.stats.cornerKicks.home === 0 &&
      resetMatch.stats.freeKicks.home === 0 &&
      resetMatch.stats.fouls.home === 0 &&
      resetMatch.stats.yellowCards.home === 0 &&
      resetMatch.stats.redCards.home === 0
    );

    // ----------------------------------------------------
    // 测试组 2：比赛时钟全生命周期状态机流转
    // ----------------------------------------------------
    console.log('\n【测试组 2】比赛时钟状态机流转（开球/暂停/中场微调/下半场自适应/完赛）');
    
    // 2.1 NOT_STARTED -> FIRST_HALF (开球)
    const startedMatch = service.updateClock(testMatchId, { period: 'FIRST_HALF' });
    assert('开球后 period 切换为 FIRST_HALF', startedMatch.clock.period === 'FIRST_HALF');
    assert('开球后 isRunning 为 true', startedMatch.clock.isRunning === true);
    assert('开球后表盘时间初始化为 00:00 (第 1 分钟)', startedMatch.clock.displayTime === '00:00' && startedMatch.clock.displayMinute === 1);
    assert('开球不插入冗余开球节点，时间线保持干净', !startedMatch.timeline.some(t => t.periodLabel?.includes('比赛开球')));

    // 2.2 FIRST_HALF -> PAUSED (暂停)
    const pausedMatch = service.updateClock(testMatchId, { period: 'PAUSED' });
    assert('暂停后 period 为 PAUSED', pausedMatch.clock.period === 'PAUSED');
    assert('暂停后 isRunning 为 false', pausedMatch.clock.isRunning === false);

    // 2.3 PAUSED -> FIRST_HALF (恢复走时并同步走表至 34分20秒)
    const resumedMatch = service.updateClock(testMatchId, {
      period: 'FIRST_HALF',
      currentSecond: 2060, // 34:20
      displayTime: '34:20',
    });
    assert('恢复后 period 为 FIRST_HALF', resumedMatch.clock.period === 'FIRST_HALF');
    assert('走表秒数校准为 2060 秒', resumedMatch.clock.currentSecond === 2060);
    assert('表盘显示时间为 34:20 (第 35 分钟)', resumedMatch.clock.displayTime === '34:20' && resumedMatch.clock.displayMinute === 35);

    // 2.4 中场休息确认 (Half-Time，输入 35 分钟)
    const htMatch = service.updateClock(testMatchId, {
      period: 'HALF_TIME',
      confirmedMinute: 35,
    });
    assert('中场休息确认后 period 为 HALF_TIME', htMatch.clock.period === 'HALF_TIME');
    assert('时钟停止走字 (isRunning = false)', htMatch.clock.isRunning === false);
    assert('中场确认分钟为 35', htMatch.clock.halfTimeMinute === 35);
    assert('中场时钟设定 secondHalfStartMinute 为 35', htMatch.clock.secondHalfStartMinute === 35);
    assert('时间线插入中场休息贯穿节点 (HT 中场休息)', htMatch.timeline.some(t => t.periodLabel === 'HT 中场休息' && t.period === 'HALF_TIME'));

    // 2.5 开始下半场 (SECOND_HALF)
    const secondHalfMatch = service.updateClock(testMatchId, { period: 'SECOND_HALF' });
    const expectedStartMin = secondHalfMatch.halfDuration || 45;
    assert('进入下半场 period 为 SECOND_HALF', secondHalfMatch.clock.period === 'SECOND_HALF');
    assert('时钟继续走字 (isRunning = true)', secondHalfMatch.clock.isRunning === true);
    assert('下半场秒数自适应从半场时长开始', secondHalfMatch.clock.currentSecond === expectedStartMin * 60);
    assert('下半场表盘显示正确起始分钟', secondHalfMatch.clock.displayMinute === expectedStartMin);
    assert('下半场开球不插入冗余开球节点', !secondHalfMatch.timeline.some(t => t.periodLabel?.includes('下半场开球')));

    // 2.6 全场比赛结束 (FINISHED)
    const finishedMatch = service.updateClock(testMatchId, { period: 'FINISHED' });
    assert('完赛后 period 为 FINISHED', finishedMatch.clock.period === 'FINISHED');
    assert('完赛后时钟停止 (isRunning = false)', finishedMatch.clock.isRunning === false);
    assert('时间线插入全场结束节点 (FT 比赛结束)', finishedMatch.timeline.some(t => t.periodLabel === 'FT 比赛结束' && t.period === 'FINISHED'));

    // ----------------------------------------------------
    // 测试组 3：动作分流机制与统计联动（重大事件 VS 纯统计项）
    // ----------------------------------------------------
    console.log('\n【测试组 3】现场动作分流机制与统计联动');
    service.reset(testMatchId);
    service.updateClock(testMatchId, { period: 'FIRST_HALF' });

    // 3.1 主队进球 (GOAL)
    const g1 = service.recordAction(testMatchId, {
      type: 'GOAL',
      side: 'home',
      minute: 10,
      secondFormatted: '09:40',
      playerName: '李小龙',
      playerNumber: 7,
      assistPlayerName: '王大伟',
    });
    assert('主队进球：比分变为 1:0', g1.score.home === 1 && g1.score.away === 0);
    assert('主队进球联动：射门 +1, 射正 +1', g1.stats.shots.home === 1 && g1.stats.shotsOnTarget.home === 1);
    const goalEvt = g1.timeline.find(t => t.type === 'goal');
    assert('进球写入时间线，包含球员/助攻信息', 
      !!goalEvt && goalEvt.playerName === '李小龙' && goalEvt.playerNumber === 7 && goalEvt.assistPlayerName === '王大伟'
    );

    // 3.2 客队黄牌 (YELLOW_CARD)
    const y1 = service.recordAction(testMatchId, {
      type: 'YELLOW_CARD',
      side: 'away',
      minute: 18,
      secondFormatted: '17:30',
      playerName: '张三',
      playerNumber: 4,
      reason: '战术犯规拉人',
    });
    assert('客队黄牌联动：黄牌 +1, 犯规 +1', y1.stats.yellowCards.away === 1 && y1.stats.fouls.away === 1);
    const yellowEvt = y1.timeline.find(t => t.type === 'yellow_card');
    assert('黄牌写入时间线，包含球员与受罚原因', !!yellowEvt && yellowEvt.reason === '战术犯规拉人');

    // 3.3 客队红牌 (RED_CARD)
    const r1 = service.recordAction(testMatchId, {
      type: 'RED_CARD',
      side: 'away',
      minute: 25,
      playerName: '李四',
      playerNumber: 5,
      reason: '严重犯规破坏进球机会',
    });
    assert('客队红牌联动：红牌 +1, 犯规 +1', r1.stats.redCards.away === 1 && r1.stats.fouls.away === 2);
    const redEvt = r1.timeline.find(t => t.type === 'red_card');
    assert('红牌写入时间线', !!redEvt && redEvt.side === 'away');

    // 3.4 主队换人 (SUBSTITUTION)
    const sub = service.recordAction(testMatchId, {
      type: 'SUBSTITUTION',
      side: 'home',
      minute: 30,
      subInPlayerName: '赵六',
      subOutPlayerName: '钱七',
    });
    const subEvt = sub.timeline.find(t => t.type === 'substitution');
    assert('换人写入时间线，包含上/下场球员', !!subEvt && subEvt.subInPlayerName === '赵六' && subEvt.subOutPlayerName === '钱七');

    // 3.5 常规时间点球 - 罚进 (复用 GOAL 通道，goalType: 'penalty')
    const penScored = service.recordAction(testMatchId, {
      type: 'GOAL',
      goalType: 'penalty',
      side: 'home',
      minute: 32,
      playerName: '王五',
      playerNumber: 9,
    });
    assert('点球罚进：主队比分累加至 2:0', penScored.score.home === 2);
    assert('点球罚进联动：射门+1, 射正+1 (当前主队射门2, 射正2)', penScored.stats.shots.home === 2 && penScored.stats.shotsOnTarget.home === 2);
    const p1Evt = penScored.timeline.find(t => t.type === 'goal' && t.goalType === 'penalty');
    assert('点球罚进写入时间线 (type: goal, goalType: penalty)', !!p1Evt && p1Evt.playerName === '王五');

    // 3.6 常规时间点球 - 罚失 (复用 GOAL 通道，goalType: 'penalty_missed')
    const penMissed = service.recordAction(testMatchId, {
      type: 'GOAL',
      goalType: 'penalty_missed',
      side: 'home',
      minute: 34,
      playerName: '孙八',
      playerNumber: 11,
    });
    assert('点球未进：主队比分不变 (仍为 2:0)', penMissed.score.home === 2);
    assert('点球未进联动：射门+1, 射正+1 (当前主队射门3, 射正3)', penMissed.stats.shots.home === 3 && penMissed.stats.shotsOnTarget.home === 3);
    const p2Evt = penMissed.timeline.find(t => t.type === 'goal' && t.goalType === 'penalty_missed');
    assert('点球未进写入时间线 (type: goal, goalType: penalty_missed)', !!p2Evt && p2Evt.playerName === '孙八');

    // 3.7 乌龙球 (复用 GOAL 通道，goalType: 'own_goal' 由客队球员打入，主队比分+1)
    const og = service.recordAction(testMatchId, {
      type: 'GOAL',
      goalType: 'own_goal',
      side: 'away',
      minute: 36,
      playerName: '客队后卫',
      playerNumber: 4,
    });
    assert('客队乌龙球：主队比分累加至 3:0', og.score.home === 3);
    const ogEvt = og.timeline.find(t => t.type === 'goal' && t.goalType === 'own_goal');
    assert('乌龙球写入时间线 (type: goal, goalType: own_goal，归属客队犯错方)', !!ogEvt && ogEvt.side === 'away');

    // 3.8 纯技术统计事件（必须不写入时间线！）
    const timelineLenBeforePure = og.timeline.length;
    
    // 主队普通射门
    const s1 = service.recordAction(testMatchId, { type: 'SHOT', side: 'home' });
    assert('纯射门：主队射门数累加至 4', s1.stats.shots.home === 4 && s1.stats.shotsOnTarget.home === 3);
    assert('纯射门：绝不写入时间线', s1.timeline.length === timelineLenBeforePure);

    // 主队射正
    const s2 = service.recordAction(testMatchId, { type: 'SHOT_ON_TARGET', side: 'home' });
    assert('纯射正：主队射门数累加至 5, 射正累加至 4', s2.stats.shots.home === 5 && s2.stats.shotsOnTarget.home === 4);
    assert('纯射正：绝不写入时间线', s2.timeline.length === timelineLenBeforePure);

    // 角球、任意球、犯规
    const c1 = service.recordAction(testMatchId, { type: 'CORNER', side: 'home' });
    const f1 = service.recordAction(testMatchId, { type: 'FREE_KICK', side: 'away' });
    const fl1 = service.recordAction(testMatchId, { type: 'FOUL', side: 'home' });
    assert('角球累加：主队角球数为 1', c1.stats.cornerKicks.home === 1);
    assert('任意球累加：客队任意球数为 1', f1.stats.freeKicks.away === 1);
    assert('犯规累加：主队犯规数为 1', fl1.stats.fouls.home === 1);
    assert('全量纯统计动作均未污染时间线流', fl1.timeline.length === timelineLenBeforePure);

    // ----------------------------------------------------
    // 测试组 4：时间线事件删除与反向扣减联动
    // ----------------------------------------------------
    console.log('\n【测试组 4】时间线事件删除与反向扣减联动');
    // 删除刚记录的主队进球
    if (goalEvt) {
      const afterDelGoal = service.deleteTimelineEvent(testMatchId, goalEvt.id);
      assert('删除进球事件：主队比分从 3 降为 2', afterDelGoal.score.home === 2);
      assert('删除进球事件：主队射门与射正分别扣减 1 (射门4, 射正3)', afterDelGoal.stats.shots.home === 4 && afterDelGoal.stats.shotsOnTarget.home === 3);
      assert('删除进球事件：该事件从时间线消失', !afterDelGoal.timeline.some(t => t.id === goalEvt.id));
    }

    // 删除点球进球
    if (p1Evt) {
      const afterDelP1 = service.deleteTimelineEvent(testMatchId, p1Evt.id);
      assert('删除点球进球：主队比分从 2 降为 1', afterDelP1.score.home === 1);
      assert('删除点球进球：主队射门与射正分别扣减 1 (射门3, 射正2)', afterDelP1.stats.shots.home === 3 && afterDelP1.stats.shotsOnTarget.home === 2);
      assert('删除点球进球：该事件从时间线消失', !afterDelP1.timeline.some(t => t.id === p1Evt.id));
    }

    // 删除点球未进
    if (p2Evt) {
      const afterDelP2 = service.deleteTimelineEvent(testMatchId, p2Evt.id);
      assert('删除点球未进：主队比分不变 (仍为 1)', afterDelP2.score.home === 1);
      assert('删除点球未进：主队射门与射正分别扣减 1 (射门2, 射正1)', afterDelP2.stats.shots.home === 2 && afterDelP2.stats.shotsOnTarget.home === 1);
      assert('删除点球未进：该事件从时间线消失', !afterDelP2.timeline.some(t => t.id === p2Evt.id));
    }

    // 删除客队乌龙球
    if (ogEvt) {
      const afterDelOg = service.deleteTimelineEvent(testMatchId, ogEvt.id);
      assert('删除客队乌龙球：主队比分回退为 0', afterDelOg.score.home === 0);
      assert('删除客队乌龙球：射门与射正保持不变 (射门2, 射正1)', afterDelOg.stats.shots.home === 2 && afterDelOg.stats.shotsOnTarget.home === 1);
      assert('删除客队乌龙球：该事件从时间线消失', !afterDelOg.timeline.some(t => t.id === ogEvt.id));
    }

    // 删除客队黄牌
    if (yellowEvt) {
      const afterDelYellow = service.deleteTimelineEvent(testMatchId, yellowEvt.id);
      assert('删除黄牌事件：客队黄牌数回退为 0', afterDelYellow.stats.yellowCards.away === 0);
      assert('删除黄牌事件：客队犯规数扣减 1 (从 2 降为 1)', afterDelYellow.stats.fouls.away === 1);
      assert('删除黄牌事件：该事件从时间线消失', !afterDelYellow.timeline.some(t => t.id === yellowEvt.id));
    }

    // ----------------------------------------------------
    // 测试组 5：30 步快照回滚撤销 (Undo) 深度测试
    // ----------------------------------------------------
    console.log('\n【测试组 5】30 步快照回滚撤销 (Undo)');
    service.reset(testMatchId);
    
    // 记录初始基线
    const baseline = service.getLiveSnapshot(testMatchId);
    assert('Undo 基线准备完毕 (比分 0:0)', baseline.score.home === 0 && baseline.score.away === 0);

    // 依次提交 4 个动作
    service.recordAction(testMatchId, { type: 'GOAL', side: 'home', playerName: '球王' }); // 动作 1: 主队进球 1:0
    service.recordAction(testMatchId, { type: 'CORNER', side: 'away' });                  // 动作 2: 客队角球 +1
    service.recordAction(testMatchId, { type: 'YELLOW_CARD', side: 'home' });              // 动作 3: 主队黄牌 +1, 犯规 +1
    service.recordAction(testMatchId, { type: 'GOAL', side: 'away', playerName: '神射手' }); // 动作 4: 客队进球 1:1

    const stateAfter4 = service.getLiveSnapshot(testMatchId);
    assert('4 步连续提交后比分为 1:1', stateAfter4.score.home === 1 && stateAfter4.score.away === 1);
    assert('4 步连续提交后客队角球为 1，主队黄牌为 1', stateAfter4.stats.cornerKicks.away === 1 && stateAfter4.stats.yellowCards.home === 1);

    // 撤销第 4 步 (客队进球)
    const undo1 = service.undo(testMatchId);
    assert('撤销第 1 次：客队比分回退至 0 (当前 1:0)', undo1.score.home === 1 && undo1.score.away === 0);

    // 撤销第 3 步 (主队黄牌)
    const undo2 = service.undo(testMatchId);
    assert('撤销第 2 次：主队黄牌与犯规回退为 0', undo2.stats.yellowCards.home === 0 && undo2.stats.fouls.home === 0);

    // 撤销第 2 步 (客队角球)
    const undo3 = service.undo(testMatchId);
    assert('撤销第 3 次：客队角球回退为 0', undo3.stats.cornerKicks.away === 0);

    // 撤销第 1 步 (主队进球)
    const undo4 = service.undo(testMatchId);
    assert('撤销第 4 次：回到初始比分 0:0', undo4.score.home === 0 && undo4.score.away === 0);
    assert('撤销第 4 次：时间线完全还原回初始状态', undo4.timeline.length === 0);

    // ----------------------------------------------------
    // 测试组 6：控球方切换与持球秒数/百分比折算
    // ----------------------------------------------------
    console.log('\n【测试组 6】控球方切换与秒数折算');
    service.reset(testMatchId);
    
    // 主队控球 600 秒，客队 400 秒
    const p1 = service.switchPossession(testMatchId, {
      side: 'home',
      homeSeconds: 600,
      awaySeconds: 400,
    });
    assert('控球切换至 home', p1.possessionSide === 'home');
    assert('持球秒数更新 (主 600s / 客 400s)', p1.stats.possession.homeSeconds === 600 && p1.stats.possession.awaySeconds === 400);
    assert('控球率正确折算为 60% : 40%', p1.stats.possession.home === 60 && p1.stats.possession.away === 40);

    // 客队控球，客队增至 600 秒 (总 1200 秒)
    const p2 = service.switchPossession(testMatchId, {
      side: 'away',
      homeSeconds: 600,
      awaySeconds: 600,
    });
    assert('控球切换至 away，控球率均等 50% : 50%', p2.stats.possession.home === 50 && p2.stats.possession.away === 50);

    // ----------------------------------------------------
    // 测试组 7：微调技术统计接口测试
    // ----------------------------------------------------
    console.log('\n【测试组 7】手动微调技术统计接口');
    const st1 = service.updateStatsDelta(testMatchId, { statKey: 'cornerKicks', side: 'home', delta: 1 });
    assert('手动增加主队角球 +1', st1.stats.cornerKicks.home === 1);
    const st2 = service.updateStatsDelta(testMatchId, { statKey: 'cornerKicks', side: 'home', delta: -1 });
    assert('手动减少主队角球 -1', st2.stats.cornerKicks.home === 0);

    // ----------------------------------------------------
    // 测试组 8：上半场补时事件与中场休息 HT 严格排序校验
    // ----------------------------------------------------
    console.log('\n【测试组 8】上半场补时事件与中场休息 HT 严格排序校验');
    service.reset(testMatchId);
    const m = service.getLiveSnapshot(testMatchId);
    m.halfDuration = 20;
    m.fullDuration = 40;
    (service as any).store.save(m);
    service.updateClock(testMatchId, { period: 'FIRST_HALF', currentSecond: 1250 }); // 20:50 补时阶段
    // 在补时阶段打点黄牌
    const stoppageYellow = service.recordAction(testMatchId, {
      type: 'YELLOW_CARD',
      side: 'home',
      minute: 21,
      secondFormatted: '20:52',
      playerName: '阿斯蒂芬',
    });
    const yellowEvent = stoppageYellow.timeline.find(t => t.playerName === '阿斯蒂芬');
    assert('补时事件格式化分钟为 20+1\'', yellowEvent?.displayMinuteFormatted === "20+1'");
    assert('补时事件归属阶段为 FIRST_HALF', yellowEvent?.period === 'FIRST_HALF');

    // 裁判鸣哨进入中场休息
    const htResult = service.updateClock(testMatchId, { period: 'HALF_TIME', confirmedMinute: 20 });
    const htDivider = htResult.timeline.find(t => t.type === 'period_node');
    assert('中场节点文案为 HT 中场休息', htDivider?.periodLabel === 'HT 中场休息');
    assert('中场节点归属阶段为 HALF_TIME', htDivider?.period === 'HALF_TIME');

    // 校验时间线数组中：补时事件必须位于 HT 中场休息之前
    const yellowIndex = htResult.timeline.findIndex(t => t.playerName === '阿斯蒂芬');
    const htIndex = htResult.timeline.findIndex(t => t.periodLabel === 'HT 中场休息');
    assert('时间线中补时事件位于 HT 中场休息之前 (yellowIndex < htIndex)', yellowIndex !== -1 && htIndex !== -1 && yellowIndex < htIndex);

    // ----------------------------------------------------
    // 测试组 8：Swagger 文档与路由元数据完备性
    // ----------------------------------------------------
    console.log('\n【测试组 8】Swagger 接口文档元数据完备性');
    const docConfig = new DocumentBuilder().setTitle('Test').build();
    const swaggerDoc = SwaggerModule.createDocument(app, docConfig);
    const paths = Object.keys(swaggerDoc.paths);
    assert('Swagger 文档成功扫描到路由', paths.length >= 8);
    assert('包含 /api/v1/matches 路由', paths.includes('/api/v1/matches'));
    assert('包含 /api/v1/matches/{id}/live 路由', paths.includes('/api/v1/matches/{id}/live'));
    assert('包含 /api/v1/matches/{id}/live/action 路由', paths.includes('/api/v1/matches/{id}/live/action'));
    assert('包含 /api/v1/matches/{id}/live/undo 路由', paths.includes('/api/v1/matches/{id}/live/undo'));

    // ----------------------------------------------------
    // 测试组 9：点球大战数据持久化与彻底重置校验
    // ----------------------------------------------------
    console.log('\n【测试组 9】点球大战数据持久化与彻底重置校验');
    service.updatePenaltyShootout(testMatchId, {
      enabled: true,
      homeScore: 3,
      awayScore: 2,
      roundsCount: 5,
      firstKickSide: 'home',
      homeKicks: [{ round: 1, side: 'home', playerName: '球员一', scored: true, isAttempted: true }],
      awayKicks: [{ round: 1, side: 'away', playerName: '客队一', scored: false, isAttempted: true }],
    });
    const withShootout = service.getLiveSnapshot(testMatchId);
    assert('点球大战成功记录，包含 firstKickSide', withShootout.penaltyShootout?.firstKickSide === 'home' && withShootout.penaltyShootout.homeScore === 3);

    const afterReset = service.reset(testMatchId);
    assert('reset() 彻底清空 penaltyShootout', afterReset.penaltyShootout === undefined);

    // 测试完毕，干净重置测试比赛
    service.reset(testMatchId);

    // 总结
    console.log('\n====================================================');
    console.log(`🎯 阶段二后端状态机测试执行完毕: ${passedCount} / ${totalCount} 通过`);
    console.log('====================================================');

    if (passedCount === totalCount) {
      console.log('🎉 全部测试项 100% 通过！轻量后端状态机已达高标准交付质量。\n');
    } else {
      console.error('⚠️ 存在未通过项，请排查！\n');
      process.exit(1);
    }
  } finally {
    await app.close();
  }
}

runTestSuite().catch((err) => {
  console.error('测试套件执行异常:', err);
  process.exit(1);
});
