import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MatchLiveService } from './match/match-live.service';

async function testPossessionClock() {
  console.log('--- Testing Possession Clock & Direct Switching ---');
  const app = await NestFactory.create(AppModule, { logger: false });
  const service = app.get(MatchLiveService);

  // 1. Create a test match
  const match = service.createMatch({
    title: '单元测试比赛-控球时钟联动',
    competitionName: '测试杯',
    venue: '测试场',
    matchType: '8_aside',
    halfDuration: 30,
    fullDuration: 60,
    homeTeam: {
      name: '测试主队',
      primaryColor: '#1a56db',
      starters: [],
    },
    awayTeam: {
      name: '测试客队',
      primaryColor: '#0ea5e9',
      starters: [],
    },
  });

  console.log(`Created test match: ${match.id}`);
  try {
    // 2. Start clock
    const started = service.updateClock(match.id, { period: 'FIRST_HALF', currentSecond: 0 });
    if (started.clock.currentSecond !== 0 || !started.clock.isRunning) {
      throw new Error(`Clock start failed: currentSecond=${started.clock.currentSecond}`);
    }
    console.log('✅ Clock started at 00:00');

    // 3. Switch to Home possession at second 10
    const homePoss = service.switchPossession(match.id, {
      side: 'home',
      currentSecond: 10,
      displayTime: '00:10',
      displayMinute: 1,
      homeSeconds: 0,
      awaySeconds: 0,
    });
    if (homePoss.clock.currentSecond !== 10) {
      throw new Error(`Expected clock currentSecond=10, got ${homePoss.clock.currentSecond}`);
    }
    if (homePoss.possessionSide !== 'home') {
      throw new Error(`Expected possessionSide='home', got ${homePoss.possessionSide}`);
    }
    console.log('✅ Switched to Home possession at second 10, clock preserved at 00:10');

    // 4. Directly switch to Away possession at second 70 without cancel
    const awayPoss = service.switchPossession(match.id, {
      side: 'away',
      currentSecond: 70,
      displayTime: '01:10',
      displayMinute: 2,
      homeSeconds: 60,
      awaySeconds: 0,
    });

    if (awayPoss.clock.currentSecond !== 70) {
      throw new Error(`Expected clock currentSecond=70, but clock jumped to ${awayPoss.clock.currentSecond}!`);
    }
    if (awayPoss.possessionSide !== 'away') {
      throw new Error(`Expected possessionSide='away', got ${awayPoss.possessionSide}`);
    }
    if (awayPoss.stats.possession.homeSeconds !== 60) {
      throw new Error(`Expected homeSeconds=60, got ${awayPoss.stats.possession.homeSeconds}`);
    }
    if (awayPoss.stats.possession.home !== 100 || awayPoss.stats.possession.away !== 0) {
      throw new Error(`Expected 100%/0% possession ratio, got ${awayPoss.stats.possession.home}%/${awayPoss.stats.possession.away}%`);
    }
    console.log('✅ Directly switched to Away possession at second 70: clock preserved at 01:10 (NO rollback!), homeSeconds=60s');

    // 5. Test another direct switch back to Home at second 90
    const homePoss2 = service.switchPossession(match.id, {
      side: 'home',
      currentSecond: 90,
      displayTime: '01:30',
      displayMinute: 2,
      homeSeconds: 60,
      awaySeconds: 20,
    });
    if (homePoss2.clock.currentSecond !== 90) {
      throw new Error(`Expected clock currentSecond=90, got ${homePoss2.clock.currentSecond}`);
    }
    if (homePoss2.possessionSide !== 'home') {
      throw new Error(`Expected possessionSide='home', got ${homePoss2.possessionSide}`);
    }
    if (homePoss2.stats.possession.homeSeconds !== 60 || homePoss2.stats.possession.awaySeconds !== 20) {
      throw new Error(`Expected 60s/20s, got ${homePoss2.stats.possession.homeSeconds}s/${homePoss2.stats.possession.awaySeconds}s`);
    }
    // 60 / (60+20) = 75%
    if (homePoss2.stats.possession.home !== 75 || homePoss2.stats.possession.away !== 25) {
      throw new Error(`Expected 75%/25%, got ${homePoss2.stats.possession.home}%/${homePoss2.stats.possession.away}%`);
    }
    console.log('✅ Direct switch back to Home at second 90: ratio=75%/25% (60s vs 20s), clock smoothly reached 01:30');

    console.log('\n🎉 ALL POSSESSION & CLOCK INTEGRATION TESTS PASSED!');
  } finally {
    service.deleteMatch(match.id);
    console.log(`Cleaned up test match: ${match.id}`);
    await app.close();
  }
}

testPossessionClock().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
