import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { MatchLiveSnapshot } from '@shared/types';
import { AppModule } from './app.module';
import { MatchLiveService } from './match/match-live.service';

async function run() {
  const dataDir = mkdtempSync(join(tmpdir(), 'match-live-http-'));
  const previousDataDir = process.env.MATCH_DATA_DIR;
  process.env.MATCH_DATA_DIR = dataDir;
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl() + '/api/v1/matches';
    async function request<T = MatchLiveSnapshot>(path = '', method = 'GET', body?: object, status = 200): Promise<T> {
      const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body),
      });
      assert.equal(response.status, status, method + ' ' + path);
      return await response.json() as T;
    }

    const match = await request('', 'POST', {
      title: '补时验收', matchType: '11_aside', halfDuration: 45,
      homeTeam: { name: '主队' }, awayTeam: { name: '客队' },
    }, 201);
    const live = '/' + match.id + '/live';
    const started = await request(live + '/clock', 'PATCH', { period: 'FIRST_HALF', currentSecond: 2780 });
    const possession = await request(live + '/possession', 'POST', { side: 'home' }, 201);
    await delay(1100);
    const ticked = await request(live);
    assert.ok(ticked.clock.currentSecond > started.clock.currentSecond);
    assert.ok(ticked.stats.possession.homeSeconds > possession.stats.possession.homeSeconds);
    assert.ok(new MatchLiveService().getLiveSnapshot(match.id).clock.currentSecond >= ticked.clock.currentSecond);

    const stoppage = await request(live + '/stoppage', 'PATCH', { half: 'FIRST_HALF', minutes: 3 });
    assert.equal(stoppage.clock.announcedStoppage?.FIRST_HALF, 3);
    await request(live + '/stoppage', 'PATCH', { half: 'SECOND_HALF', minutes: 3 }, 409);
    await request(live + '/stoppage', 'PATCH', { half: 'FIRST_HALF', minutes: 2.5 }, 400);

    const action = {
      type: 'GOAL', side: 'home', playerName: '主队球员',
      expectedVersion: stoppage.version, minute: 47, secondFormatted: '46:20',
    };
    const temporaryFile = join(dataDir, 'matches.json.tmp');
    mkdirSync(temporaryFile);
    await request(live + '/action', 'POST', action, 500);
    assert.equal((await request(live)).score.home, 0);
    rmdirSync(temporaryFile);
    const goal = await request(live + '/action', 'POST', action, 201);
    assert.equal(goal.score.home, 1);
    assert.equal(goal.timeline.at(-1)?.displayMinuteFormatted, "45+2'");
    await request(live + '/action', 'POST', action, 409);
    const list = await request<MatchLiveSnapshot[]>();
    assert.equal(list.find(entry => entry.id === match.id)?.score.home, 1);

    const card = await request(live + '/action', 'POST', { type: 'YELLOW_CARD', side: 'away' }, 201);
    const undoCard = await request(live + '/undo', 'POST', undefined, 201);
    const undoGoal = await request(live + '/undo', 'POST', undefined, 201);
    assert.ok(undoCard.version > card.version && undoGoal.version > undoCard.version);
    assert.equal(undoCard.stats.yellowCards.away, 0);
    assert.equal(undoGoal.score.home, 0);
    assert.ok(undoGoal.clock.currentSecond >= card.clock.currentSecond);

    const paused = await request(live + '/clock', 'PATCH', { period: 'PAUSED', currentSecond: 2900 });
    await request(live + '/clock', 'PATCH', { period: 'FIRST_HALF', expectedVersion: started.version }, 409);
    assert.equal((await request(live)).clock.currentSecond, paused.clock.currentSecond);
    const halfTime = await request(live + '/clock', 'PATCH', { period: 'HALF_TIME' });
    assert.equal(halfTime.clock.displayTime, '48:20');
    assert.equal(halfTime.timeline.at(-1)?.displayMinuteFormatted, "45+4'");
    const second = await request(live + '/clock', 'PATCH', { period: 'SECOND_HALF' });
    assert.equal(second.clock.displayTime, '45:00');
    const secondStoppage = await request(live + '/stoppage', 'PATCH', { half: 'SECOND_HALF', minutes: 2 });
    assert.deepEqual(secondStoppage.clock.announcedStoppage, { FIRST_HALF: 3, SECOND_HALF: 2 });
    const settled = await request(live + '/clock', 'PATCH', { period: 'PAUSED', regularTimeEnded: true });
    assert.equal(settled.clock.regularTimeEnded, true);
    const finished = await request(live + '/clock', 'PATCH', { period: 'FINISHED' });
    assert.equal(finished.clock.period, 'FINISHED');
    await request(live + '/action', 'POST', { type: 'GOAL', side: 'home' }, 409);
    await request(live + '/penalty-shootout', 'PATCH', { enabled: true }, 409);
    assert.equal((await request(live)).score.home, finished.score.home);
    assert.equal(new MatchLiveService().getLiveSnapshot(match.id).clock.period, 'FINISHED');

    console.log('HTTP 回归通过：走表、补时、比分同步、重复提交、连续撤销、中场和完赛');
  } finally {
    await app.close();
    if (previousDataDir === undefined) delete process.env.MATCH_DATA_DIR;
    else process.env.MATCH_DATA_DIR = previousDataDir;
    rmSync(dataDir, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
