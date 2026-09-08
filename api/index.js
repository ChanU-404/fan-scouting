const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

const scoutingRouter = require('./scoutingRouter');

const app = express();
app.use(cors());
app.use(express.json());
const parser = new Parser();

// 스카우팅 카드 게임 API 마운트
app.use('/api', scoutingRouter);


const KBSA_BASE = "https://www.korea-baseball.com/record/record/league_record";
const KBSA_GAME_BASE = "https://www.korea-baseball.com/game/game_list";
const KBSA_CALENDAR_BASE = "https://www.korea-baseball.com/game/calendar";

const AXIOS_CONFIG = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
  },
  timeout: 10000
};

async function getSubLeagues(kind_cd) {
  try {
    const { data } = await axios.get(`${KBSA_BASE}?kind_cd=${kind_cd}&season=2026`, AXIOS_CONFIG);
    const $ = cheerio.load(data);
    const subLeagues = [];
    $('select[name="group_part_idx"] option').each((i, el) => {
      const $opt = $(el);
      const lid = $opt.attr('lig_idx');
      const gno = $opt.attr('group_no') || "";
      const pno = $opt.attr('part_no') || "";
      const name = $opt.text().trim();
      if (lid && name && name !== "선택") {
        subLeagues.push({ id: `${lid}|${gno}|${pno}`, name });
      }
    });
    return subLeagues;
  } catch (e) { return []; }
}

async function scrapeAmateurTeams(kind_cd, fullId) {
  try {
    const [lid, gno, pno] = (fullId || "1367||").split('|');
    const url = `${KBSA_BASE}?kind_cd=${kind_cd}&season=2026&lig_idx=${lid}&group_no=${gno}&part_no=${pno}&record_type=1`;
    const { data } = await axios.get(url, AXIOS_CONFIG);
    const $ = cheerio.load(data);
    const teams = [];
    $('.record_list li').each((i, el) => {
      const $el = $(el);
      const rank = $el.find('.order').first().text().trim();
      const name = $el.find('.team').first().text().trim();
      const stats = $el.find('.records dd').map((_, dd) => $(dd).text().trim()).get();
      if (name && name !== "팀명") {
        teams.push({
          rank: parseInt(rank) || i + 1, name,
          games: parseInt(stats[0]) || 0, wins: parseInt(stats[1]) || 0,
          losses: parseInt(stats[2]) || 0, draws: parseInt(stats[3]) || 0,
          winRate: parseFloat(stats[4]) || 0, gameDiff: stats[stats.length - 1] || "0.0", streak: "-"
        });
      }
    });
    return teams;
  } catch (e) { return []; }
}

async function scrapeAmateurHitters(kind_cd, fullId) {
  try {
    const [lid, gno, pno] = (fullId || "1367||").split('|');
    const url = `${KBSA_BASE}?kind_cd=${kind_cd}&season=2026&lig_idx=${lid}&group_no=${gno}&part_no=${pno}&record_type=4`;
    const { data } = await axios.get(url, AXIOS_CONFIG);
    const $ = cheerio.load(data);
    const players = [];
    $('.record_list li').each((i, el) => {
      const $el = $(el);
      const name = $el.find('.player').text().trim();
      const team = $el.find('.team').text().trim();
      const stats = $el.find('.records dd').map((_, dd) => $(dd).text().trim()).get();
      const playerLink = $el.find('.player a').attr('href') || '';
      const person_no = (playerLink.match(/person_no=([^&]+)/) || [])[1] || '';
      if (name && team && name !== "이름") {
        players.push({
          name, team, person_no,
          avg: parseFloat(stats[0]) || 0,
          g: parseInt(stats[2]) || 0,
          ab: parseInt(stats[4]) || 0,
          h: parseInt(stats[6]) || 0,
          hr: parseInt(stats[9]) || 0,
          rbi: parseInt(stats[11]) || 0,
          sb: parseInt(stats[12]) || 0,
          bb: parseInt(stats[15]) || 0,
          ops: parseFloat(stats[23]) || 0
        });
      }
    });
    return players;
  } catch (e) { return []; }
}

async function scrapeAmateurPitchers(kind_cd, fullId) {
  try {
    const [lid, gno, pno] = (fullId || "1367||").split('|');
    const url = `${KBSA_BASE}?kind_cd=${kind_cd}&season=2026&lig_idx=${lid}&group_no=${gno}&part_no=${pno}&record_type=5`;
    const { data } = await axios.get(url, AXIOS_CONFIG);
    const $ = cheerio.load(data);
    const players = [];
    $('.record_list li').each((i, el) => {
      const $el = $(el);
      const name = $el.find('.player').text().trim();
      const team = $el.find('.team').text().trim();
      const stats = $el.find('.records dd').map((_, dd) => $(dd).text().trim()).get();
      const playerLink = $el.find('.player a').attr('href') || '';
      const person_no = (playerLink.match(/person_no=([^&]+)/) || [])[1] || '';
      if (name && team && name !== "이름") {
        const ip = stats[9] || "0";
        players.push({
          name, team, person_no,
          era: parseFloat(stats[0]) || 0,
          g: parseInt(stats[2]) || 0,
          win: parseInt(stats[3]) || 0,
          loss: parseInt(stats[4]) || 0,
          sv: 0, hld: 0,
          ip: ip,
          ipSort: parseFloat(ip) || 0,
          h: parseInt(stats[10]) || 0,
          hr_a: parseInt(stats[11]) || 0,
          bb: parseInt(stats[14]) || 0,
          so: parseInt(stats[17]) || 0,
          fip: 0
        });
      }
    });
    return players;
  } catch (e) { return []; }
}

async function scrapeAmateurSchedule(targetDate, kind_cd = '31', subLeagueId = '') {
  try {
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const year = targetDate.getFullYear();
    const targetNum = `${year}${mm}${dd}`;

    const [lid] = (subLeagueId || "").split('|');
    const ligParam = lid ? `&lig_idx=${lid}` : '';
    
    // game_list가 lig_idx 필터링을 더 잘 지원함
    const url = `${KBSA_GAME_BASE}?kind_cd=${kind_cd}&season=${year}&search_month=${mm}${ligParam}`;
    const { data } = await axios.get(url, AXIOS_CONFIG);
    const $ = cheerio.load(data);
    const matches = [];

    $('h4').each((i, el) => {
      const $h4 = $(el);
      const dateText = $h4.text().trim(); // "2026.05.12(화)"
      const cleanDateNum = dateText.replace(/[^0-9]/g, '').substring(0, 8);
      
      if (cleanDateNum === targetNum) {
        const $ul = $h4.next('ul');
        $ul.find('li').each((j, gEl) => {
          const $g = $(gEl);
          const time = $g.find('.inform .time').text().trim();
          const stadium = $g.find('.inform .place').text().trim();
          const away = $g.find('.team1 .team').text().trim();
          const home = $g.find('.team2 .team').text().trim();
          const aScore = $g.find('.team1 .score').text().trim();
          const hScore = $g.find('.team2 .score').text().trim();
          const leagueName = $g.find('.game_name').text().trim();
          
          if (!home || !away) return;
          let score = "경기전";
          if (aScore && hScore) score = `${aScore} - ${hScore}`;

          matches.push({
            id: `am-${cleanDateNum}-${i}-${j}`,
            home,
            away,
            stadium,
            time,
            score,
            leagueName: leagueName || (kind_cd === '31' ? "고교야구" : "대학야구"),
            fullDate: dateText
          });
        });
      }
    });

    return matches;
  } catch (e) { 
    console.error("Amateur schedule scrape error:", e.message);
    return []; 
  }
}

async function getFuturesSchedule(targetDate) {
  try {
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const targetKey = `${mm}.${dd}`;

    const url = `https://www.koreabaseball.com/Futures/Schedule/GameList.aspx?searchMonth=${mm}`;
    const { data } = await axios.get(url, {
      ...AXIOS_CONFIG,
      headers: { ...AXIOS_CONFIG.headers, 'Referer': 'https://www.koreabaseball.com/' }
    });
    const $ = cheerio.load(data);
    const matches = [];
    let currentScrapedDate = "";
    $('table.scheduleBoard tbody tr').each((i, tr) => {
      const $tr = $(tr);
      const $dayTd = $tr.find('td.day');
      
      // Update the current date if a new td.day is found
      if ($dayTd.length > 0) {
        const dateStr = $dayTd.text().trim();
        const m = dateStr.match(/(\d{2})\.(\d{2})/);
        if (m) currentScrapedDate = `${m[1]}.${m[2]}`;
      }
      
      if (!currentScrapedDate) return;

      const $playTd = $tr.find('td.play');
      if ($playTd.length > 0) {
        const spans = $playTd.find('span').map((_, s) => $(s).text().trim()).get();
        const teams = spans.filter(s => s && isNaN(s) && s !== 'vs');
        
        if (teams.length >= 2) {
          const away = teams[0];
          const home = teams[teams.length - 1];
          const time = $tr.find('td.time').text().trim();
          const stadium = $tr.find('td.ballpark').text().trim();
          
          const scoreSpans = $playTd.find('em span').map((_, s) => $(s).text().trim()).get();
          const nums = scoreSpans.filter(s => s && !isNaN(s));
          let scoreText = "경기전";
          if (nums.length >= 2) scoreText = `${nums[0]} - ${nums[nums.length-1]}`;

          const match = { id: `fut-${currentScrapedDate}-${i}`, away, home, time, stadium, score: scoreText, leagueName: "KBO 퓨처스리그", fullDate: `2026.${currentScrapedDate}` };
          
          if (currentScrapedDate === targetKey) matches.push(match);
        }
      }
    });

    return matches;
  } catch (e) { 
    console.error("Futures scrape error:", e.message);
    return []; 
  }
}

app.get('/api/subleagues', async (req, res) => {
  const { kind_cd = '31' } = req.query;
  res.json(await getSubLeagues(kind_cd));
});

app.get('/api/teams', async (req, res) => {
  const { league = 'kbo', subLeagueId } = req.query;
  if (league === 'kbo') {
    const year = new Date().getFullYear();
    const { data } = await axios.get(`https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/teams`);
    return res.json(data?.result?.seasonTeamStats?.map(t => ({ rank: t.ranking, name: t.teamName, games: t.gameCount, wins: t.winGameCount, losses: t.loseGameCount, draws: t.drawnGameCount, winRate: parseFloat(t.wra.toFixed(3)), gameDiff: t.gameBehind, streak: t.continuousGameResult })) || []);
  }
  if (league === 'futures') {
    try {
      const { data } = await axios.get('https://sports.daum.net/prx/hermes/api/team/rank.json?leagueCode=FUTURES');
      const groups = {};
      data.list.forEach(t => {
        const div = t.subLeague1depth?.nameKo || "기타";
        if (!groups[div]) groups[div] = [];
        groups[div].push({ 
          rank: t.rank.rank, name: t.name, games: t.rank.game, 
          wins: t.rank.win, losses: t.rank.loss, draws: t.rank.draw, 
          winRate: parseFloat(t.rank.wpct.toFixed(3)), 
          gameDiff: t.rank.gb || "0.0", streak: "-" 
        });
      });
      return res.json({ isGrouped: true, groups });
    } catch (e) { return res.json([]); }
  }
  const kind_cd = league === 'highschool' ? '31' : '41';
  res.json(await scrapeAmateurTeams(kind_cd, subLeagueId));
});

app.get('/api/players', async (req, res) => {
  const { league = 'kbo', subLeagueId } = req.query;
  if (league === 'kbo') {
    const year = new Date().getFullYear();
    let url = `https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=HITTER&gameType=REGULAR_SEASON&pageSize=100&sort=OPS`;
    const { data: hData } = await axios.get(url);
    const hitters = hData?.result?.seasonPlayerStats?.map(p => ({ name: p.playerName, team: p.teamName, person_no: p.playerId, g: p.hitterGameCount || 0, ab: p.hitterAb || 0, h: p.hitterHit || 0, avg: parseFloat((p.hitterHra || 0).toFixed(3)), hr: p.hitterHr || 0, rbi: p.hitterRbi || 0, sb: p.hitterSb || 0, bb: p.hitterBb || 0, ops: parseFloat((p.hitterOps || 0).toFixed(3)) })) || [];
    let pUrl = `https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=PITCHER&gameType=REGULAR_SEASON&pageSize=100&sort=ERA`;
    const { data: pData } = await axios.get(pUrl);
    const pitchers = pData?.result?.seasonPlayerStats?.map(p => ({ name: p.playerName, team: p.teamName, person_no: p.playerId, g: p.pitcherGameCount || 0, era: parseFloat((p.pitcherEra || 0).toFixed(2)), win: p.pitcherWin || 0, loss: p.pitcherLose || 0, sv: p.pitcherSave || 0, hld: p.pitcherHold || 0, ip: p.pitcherInning || "0", ipSort: parseFloat(p.pitcherInning) || 0, h: p.pitcherHit || 0, hr_a: p.pitcherHr || 0, bb: p.pitcherBb || 0, so: p.pitcherKk || 0, fip: 0 })) || [];
    return res.json({ hitters, pitchers });
  }
  if (league === 'futures') {
    try {
      const year = new Date().getFullYear();
      const { data: hData } = await axios.get(`https://sports.daum.net/prx/hermes/api/person/rank.json?leagueCode=FUTURES&seasonKey=${year}&personType=BATTER`);
      const { data: pData } = await axios.get(`https://sports.daum.net/prx/hermes/api/person/rank.json?leagueCode=FUTURES&seasonKey=${year}&personType=PITCHER`);
      const hitters = hData.list.map(p => ({ 
        name: p.name, team: p.team.shortName, person_no: p.cpPersonId, g: p.stat.batGp || 0, ab: p.stat.batAb || 0, 
        h: p.stat.batH || 0, avg: parseFloat((p.stat.batAvg || 0).toFixed(3)), 
        hr: p.stat.batHr || 0, rbi: p.stat.batRbi || 0, sb: p.stat.batSb || 0, 
        bb: p.stat.batBb || 0, ops: parseFloat((p.stat.batOps || 0).toFixed(3)) 
      }));
      const pitchers = pData.list.map(p => ({ 
        name: p.name, team: p.team.shortName, person_no: p.cpPersonId, g: p.stat.pitGp || 0, era: parseFloat((p.stat.pitEra || 0).toFixed(2)), 
        win: p.stat.pitW || 0, loss: p.stat.pitL || 0, sv: p.stat.pitSv || 0, hld: p.stat.pitHld || 0, 
        ip: p.stat.pitIp || "0", ipSort: parseFloat(p.stat.pitIp) || 0, h: p.stat.pitH || 0, 
        hr_a: p.stat.pitHr || 0, bb: p.stat.pitBb || 0, so: p.stat.pitSo || 0, fip: 0 
      }));
      return res.json({ hitters, pitchers });
    } catch (e) { return res.json({ hitters: [], pitchers: [] }); }
  }
  const kind_cd = league === 'highschool' ? '31' : '41';
  res.json({ hitters: await scrapeAmateurHitters(kind_cd, subLeagueId), pitchers: await scrapeAmateurPitchers(kind_cd, subLeagueId) });
});

app.get('/api/schedule', async (req, res) => {
  const { league = 'kbo', date: dateParam, subLeagueId } = req.query;
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const apiDate = targetDate.toISOString().split('T')[0];
  const dateStr = `${targetDate.getFullYear()}년 ${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일`;

  if (league === 'futures') {
    const matches = await getFuturesSchedule(targetDate);
    return res.json({ date: dateStr, matches });
  }
  if (league === 'highschool' || league === 'college') {
    const kind_cd = league === 'highschool' ? '31' : '41';
    const matches = await scrapeAmateurSchedule(targetDate, kind_cd, subLeagueId);
    return res.json({ date: dateStr, matches });
  }
  try {
    let url = `https://api-gw.sports.naver.com/schedule/games?fields=basic%2Cschedule%2Cbaseball%2CmanualRelayUrl&upperCategoryId=kbaseball&categoryId=kbo&fromDate=${apiDate}&toDate=${apiDate}&size=500`;
    const { data } = await axios.get(url);
    const matches = data?.result?.games?.map(game => ({ 
      id: game.gameId, 
      home: game.homeTeamName, 
      away: game.awayTeamName, 
      stadium: game.stadium, 
      time: game.startTime || game.gameDateTime.split('T')[1].substring(0, 5), 
      score: game.statusCode === 'BEFORE' ? '경기전' : game.cancel ? '취소' : `${game.homeTeamScore} - ${game.awayTeamScore} (${game.statusInfo})`, 
      naverUrl: `https://m.sports.naver.com/game/${game.gameId}`,
      homeStarter: game.homeStarterName || '',
      awayStarter: game.awayStarterName || ''
    })) || [];
    res.json({ date: dateStr, matches });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch schedule' }); }
});

app.get('/api/news', async (req, res) => {
  const { league = 'kbo' } = req.query;
  const queries = { kbo: 'KBO 야구', futures: 'KBO 퓨처스리그', highschool: '고교야구', college: '대학야구' };
  try {
    const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(queries[league])}&hl=ko&gl=KR&ceid=KR:ko`);
    res.json(feed.items.slice(0, 10).map(item => ({ title: item.title, link: item.link, time: new Date(item.pubDate).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), source: item.source || 'News' })));
  } catch (error) { res.status(500).json({ error: 'Failed to fetch news' }); }
});

// 팀별 1군 로스터 및 팀 아이디 매핑
const KBO_TEAM_IDS = {
  'KIA': 'HT', '삼성': 'SS', 'LG': 'LG', '두산': 'OB',
  'KT': 'KT', 'SSG': 'SK', '롯데': 'LT', '한화': 'HH',
  'NC': 'NC', '키움': 'WO'
};

app.get('/api/roster', async (req, res) => {
  const { team } = req.query;
  const year = new Date().getFullYear();
  try {
    const [hData, pData] = await Promise.all([
      axios.get(`https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=HITTER&gameType=REGULAR_SEASON&pageSize=200&sort=OPS`),
      axios.get(`https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=PITCHER&gameType=REGULAR_SEASON&pageSize=200&sort=ERA`)
    ]);
    const teamId = KBO_TEAM_IDS[team];
    const toPlayer = (p, type) => ({
      name: p.playerName,
      no: p.backNumber,
      type,
      playerId: p.playerId,
      imageUrl: p.playerImageUrl,
      teamId: p.teamId
    });
    
    if (team) {
      const hitters = (hData.data?.result?.seasonPlayerStats || [])
        .filter(p => p.teamId === teamId)
        .map(p => toPlayer(p, 'hitter'));
      const pitchers = (pData.data?.result?.seasonPlayerStats || [])
        .filter(p => p.teamId === teamId)
        .map(p => toPlayer(p, 'pitcher'));
      return res.json({ team, hitters, pitchers });
    }

    const allHitters = (hData.data?.result?.seasonPlayerStats || []).map(p => toPlayer(p, 'hitter'));
    const allPitchers = (pData.data?.result?.seasonPlayerStats || []).map(p => toPlayer(p, 'pitcher'));
    const rosterByTeam = {};
    [...allHitters, ...allPitchers].forEach(p => {
      const tName = Object.keys(KBO_TEAM_IDS).find(k => KBO_TEAM_IDS[k] === p.teamId) || p.teamId;
      if (!rosterByTeam[tName]) rosterByTeam[tName] = { hitters: [], pitchers: [] };
      if (p.type === 'hitter') rosterByTeam[tName].hitters.push(p);
      else rosterByTeam[tName].pitchers.push(p);
    });
    res.json(rosterByTeam);
  } catch (e) {
    console.error('Roster error:', e.message);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// 엔트리 등록/말소 현황 스크래핑
app.get('/api/entry-exit', async (req, res) => {
  try {
    const { data: html } = await axios.get('https://www.koreabaseball.com/Player/RegisterAll.aspx', AXIOS_CONFIG);
    const $ = cheerio.load(html);
    const entry = [];
    const exit = [];

    // 등록 현황
    $('#cphContents_cphContents_cphContents_pnlEntryY table tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length === 3) {
        entry.push({
          name: tds.eq(0).text().trim(),
          pos: tds.eq(1).text().trim(),
          team: tds.eq(2).text().trim()
        });
      }
    });

    // 말소 현황
    $('.fistCancelStatus table tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length === 3) {
        exit.push({
          name: tds.eq(0).text().trim(),
          pos: tds.eq(1).text().trim(),
          team: tds.eq(2).text().trim()
        });
      }
    });

    const targetDateStr = $('#cphContents_cphContents_cphContents_hfSearchDate').val() || '';
    const parsedDate = targetDateStr ? `${targetDateStr.slice(4,6)}/${targetDateStr.slice(6,8)} 기준` : '실시간';

    res.json({ entry, exit, date: parsedDate });
  } catch (e) {
    console.error('Entry-Exit error:', e.message);
    res.status(500).json({ error: 'Failed to fetch entry-exit data' });
  }
});

// 부상 선수 명단 (KBO 공식 AJAX API 활용)
app.get('/api/injured', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    // bdSc=18: 부상자 명단
    const { data } = await axios.post('https://www.koreabaseball.com/ws/Player.asmx/GetTradeList', 
      `seasonId=${year}&monthId=0&bdSc=18&teamName=&searchIf=&pageNo=1&listCount=20`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );

    const injuredData = (data.rows || []).map(row => {
      const r = row.row;
      const playerNameRaw = r[3].Text || ''; // "손호영(외야수)"
      const name = playerNameRaw.split('(')[0];
      const team = r[2].Text;
      const remarks = r[4].Text || ''; // "10일 / 5.9"

      // Parse remarks "10일 / 5.9"
      const parts = remarks.split('/');
      const ilDays = parts[0] ? parts[0].trim() : '미상'; // "10일"
      const startDate = parts[1] ? parts[1].trim() : r[0].Text; // "5.9"

      return {
        name,
        team,
        injury: `IL ${ilDays} 등재`,
        status: '부상/재활',
        ilDays,
        startDate,
        weeks: parseInt(ilDays.replace(/[^0-9]/g, '')) / 7 || 2,
        elapsedWeeks: 1, // Placeholder
        since: startDate
      };
    });

    // 뉴스 링크 비동기 처리 및 부상명 추출
    const enrichedInjured = await Promise.all(injuredData.map(async (p) => {
      try {
        const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(p.name + ' 부상 야구')}&hl=ko&gl=KR&ceid=KR:ko`);
        const item = feed.items[0];
        p.newsLink = item?.link || `https://search.naver.com/search.naver?where=news&query=야구선수+${encodeURIComponent(p.name)}+부상`;
        
        // 간단한 부상 키워드 추출
        p.injuryName = '상세 알 수 없음 (뉴스 참고)';
        if (item && item.title) {
          const keywords = ['어깨', '팔꿈치', '햄스트링', '무릎', '손가락', '발목', '허리', '허벅지', '옆구리', '종아리', '발가락', '쇄골', '갈비뼈', '통증', '염증', '골절', '수술', '미세손상', '파열', '염좌', '재활'];
          const found = keywords.filter(k => item.title.includes(k));
          if (found.length > 0) {
            // 부위와 증상을 묶어서 표시 (예: "팔꿈치, 통증")
            p.injuryName = found.join(', ') + ' 의심';
          }
        }
      } catch (err) {
        p.newsLink = `https://search.naver.com/search.naver?where=news&query=야구선수+${encodeURIComponent(p.name)}+부상`;
        p.injuryName = '상세 알 수 없음';
      }
      return p;
    }));

    res.json(enrichedInjured);
  } catch (e) {
    console.error('Injured List error:', e.message);
    res.status(500).json({ error: 'Failed to fetch injury data' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(3001, () => console.log('Backend running on port 3001 — Scouting Card System Active ⚾'));
}
module.exports = app;
