import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, Calendar, Trophy, Newspaper, Users, ChevronLeft, ChevronRight, LayoutDashboard, ExternalLink, Plus, AlertTriangle, Shield, X, ChevronDown, ChevronUp, CreditCard, Search as SearchIcon, LogIn, LogOut, Star, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PlayerCard from './components/PlayerCard';
import ScoutingPanel from './components/ScoutingPanel';
import AuthModal from './components/AuthModal';
import SplashLogin from './components/SplashLogin';

// 리그별 로고 이미지
const LEAGUE_LOGOS = {
  kbo: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/KBOHome/resources/images/common/logo.png',
  futures: 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/KBOHome/resources/images/common/logo_futures_s.png',
  highschool: 'https://www.korea-baseball.com/img/common/bi_kbsa.png',
  college: 'https://www.korea-baseball.com/img/common/bi_kbsa.png'
};

// 리그별 이름
const LEAGUE_NAMES = {
  kbo: 'KBO Fan Scouting',
  futures: 'Futures Fan Scouting',
  highschool: '고교야구 Fan Scouting',
  college: '대학야구 Fan Scouting'
};

// 선수 프로필 링크 생성
const getPlayerLink = (player, league, isPitcher = false) => {
  if (!player) return '#';
  const name = typeof player === 'string' ? player : player.name;
  const encoded = encodeURIComponent(name);
  
  if (typeof player === 'object' && player.person_no) {
    if (league === 'kbo' || league === 'futures') {
      const type = isPitcher ? 'PitcherDetail' : 'HitterDetail';
      return `https://www.koreabaseball.com/Record/Player/${type}/Basic.aspx?playerId=${player.person_no}`;
    } else {
      return `https://www.korea-baseball.com/info/player/player_view?person_no=${player.person_no}&gubun=P`;
    }
  }

  if (league === 'kbo' || league === 'futures') {
    return `https://sports.naver.com/search?q=${encoded}&where=baseball`;
  }
  return `http://www.korea-baseball.com/info/player/player_list?search_method=player_name&search_word=${encoded}`;
};

const TEAM_LOGOS = {
  // KBO 1군 & Futures Mapping (Full Names & Short Names)
  'KIA': '/logos/KIA.png', 'KIA 타이거즈': '/logos/KIA.png',
  '삼성': '/logos/삼성.png', '삼성 라이온즈': '/logos/삼성.png',
  'LG': '/logos/LG.png', 'LG 트윈스': '/logos/LG.png',
  '두산': '/logos/두산.png', '두산 베어스': '/logos/두산.png',
  'KT': '/logos/KT.png', 'KT 위즈': '/logos/KT.png',
  'SSG': '/logos/SSG.png', 'SSG 랜더스': '/logos/SSG.png',
  '롯데': '/logos/롯데.png', '롯데 자이언츠': '/logos/롯데.png',
  '한화': '/logos/한화.png', '한화 이글스': '/logos/한화.png',
  'NC': '/logos/NC.png', 'NC 다이노스': '/logos/NC.png',
  '키움': '/logos/키움.png', '키움 히어로즈': '/logos/키움.png',
  // Futures Specific
  '상무': 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/2026/emblemF_SM.png',
  '고양': 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/2026/emblemF_WO.png',
  '고양 히어로즈': 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/2026/emblemF_WO.png',
  '울산': 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/2026/emblemF_LT.png',
  '울산 웨일즈': 'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/emblem/regular/2026/emblemF_LT.png'
};

const getTeamLogo = (name) => {
  if (!name) return null;
  if (TEAM_LOGOS[name]) return TEAM_LOGOS[name];
  // Check if any key is contained in the name (e.g. "롯데" in "롯데 자이언츠")
  const key = Object.keys(TEAM_LOGOS).find(k => name.includes(k));
  return key ? TEAM_LOGOS[key] : null;
};

const TEAM_COLORS = {
  'KT': '#000000',
  'LG': '#C30452',
  'SSG': '#CE0E2D',
  '삼성': '#074CA1',
  'NC': '#315288',
  'KIA': '#EA0029',
  '두산': '#131230',
  '롯데': '#041E42',
  '한화': '#FF6600',
  '키움': '#820024'
};

const GAME_DIFF_TREND_DATA = [
  { name: '3/23', KT: 2, LG: 1.5, SSG: 5, 삼성: 1, NC: 3, KIA: 0, 두산: 4, 롯데: 6, 한화: 7, 키움: 8 },
  { name: '3/26', KT: 2.5, LG: 1, SSG: 4.5, 삼성: 1.5, NC: 2.8, KIA: 0, 두산: 4.2, 롯데: 6.2, 한화: 7, 키움: 8.5 },
  { name: '3/30', KT: 3, LG: 1, SSG: 6, 삼성: 1.5, NC: 2.5, KIA: 0, 두산: 4.5, 롯데: 5.5, 한화: 7.5, 키움: 9 },
  { name: '4/02', KT: 3.5, LG: 0.5, SSG: 5.8, 삼성: 2, NC: 2, KIA: 0.2, 두산: 3.8, 롯데: 6.5, 한화: 7.2, 키움: 9.5 },
  { name: '4/07', KT: 4, LG: 0, SSG: 5.5, 삼성: 2, NC: 1.5, KIA: 0.5, 두산: 3, 롯데: 8, 한화: 7, 키움: 10 },
  { name: '4/10', KT: 4.8, LG: 0.3, SSG: 5.2, 삼성: 2.8, NC: 1.8, KIA: 0.3, 두산: 2.8, 롯데: 8.5, 한화: 6.8, 키움: 9.8 },
  { name: '4/15', KT: 5, LG: 1, SSG: 4.5, 삼성: 3, NC: 2, KIA: 0, 두산: 2.5, 롯데: 9, 한화: 6.5, 키움: 8.5 },
  { name: '4/18', KT: 5, LG: 1.2, SSG: 3, 삼성: 3.5, NC: 2.5, KIA: 0.3, 두산: 2.5, 롯데: 9, 한화: 7, 키움: 9 },
  { name: '4/23', KT: 4.5, LG: 1.5, SSG: 0, 삼성: 5, NC: 3, KIA: 0.5, 두산: 2.5, 롯데: 8.5, 한화: 7, 키움: 10.5 },
  { name: '4/26', KT: 3.5, LG: 1.8, SSG: 1, 삼성: 4.5, NC: 3.5, KIA: 1, 두산: 3, 롯데: 8.8, 한화: 7.8, 키움: 10.8 },
  { name: '5/01', KT: 0, LG: 1.5, SSG: 2, 삼성: 3.5, NC: 4.5, KIA: 5.5, 두산: 6, 롯데: 8, 한화: 9, 키움: 11 },
  { name: '5/04', KT: 0, LG: 2, SSG: 3.5, 삼성: 4, NC: 5.5, KIA: 6.5, 두산: 7.5, 롯데: 8, 한화: 9.5, 키움: 12 },
  { name: '5/07', KT: 0, LG: 2.2, SSG: 3.8, 삼성: 4.2, NC: 5.8, KIA: 6.8, 두산: 7.8, 롯데: 8.2, 한화: 9.8, 키움: 12.2 },
  { name: '5/11', KT: 0, LG: 2.5, SSG: 4, 삼성: 4.5, NC: 6, KIA: 7, 두산: 8, 롯데: 8.5, 한화: 10, 키움: 12.5 },
];

const CustomizedLabel = (props) => {
  const { x, y, index, data, team } = props;
  if (index === data.length - 1) {
    const logo = getTeamLogo(team);
    return (
      <g transform={`translate(${x + 10}, ${y - 12})`}>
        <circle r="13" fill="white" cx="12" cy="12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <image href={logo} width="20" height="20" x="2" y="2" />
      </g>
    );
  }
  return null;
};

const BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const API = `${BASE_URL}/api`;

function App() {
  const [selectedLeague, setSelectedLeague] = useState('kbo');
  const [subLeagues, setSubLeagues] = useState([]);
  const [selectedSubLeague, setSelectedSubLeague] = useState('');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState({ hitters: [], pitchers: [] });
  const [news, setNews] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [activeTab, setActiveTab] = useState('teams');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [favoriteTeam, setFavoriteTeam] = useState('Default');

  // ─── 카드 게임 상태 ──────────────────────────────────────────────────
  const [mainMode, setMainMode] = useState('scouting'); // 'dashboard' | 'cards' | 'scouting'
  const [cardList, setCardList] = useState([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardFilter, setCardFilter] = useState({ team: '', type: '', league: '', grade: '', sort: 'overall', search: '' });
  const [selectedPlayer, setSelectedPlayer] = useState(null); // 카드 상세 / 스카우팅 대상
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState(null);
  const [scoutingMode, setScoutingMode] = useState('browse'); // 'browse' | 'detail' | 'scout'
  const [scoutProfile, setScoutProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // ─── 간편 닉네임 상태 (토큰 기반) ────────────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('kbo_token') || null);
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kbo_user')); } catch { return null; }
  });

  const handleLogin = (token, user) => {
    localStorage.setItem('kbo_token', token);
    localStorage.setItem('kbo_user', JSON.stringify(user));
    setAuthToken(token);
    setAuthUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('kbo_token');
    localStorage.removeItem('kbo_user');
    setAuthToken(null);
    setAuthUser(null);
  };


  // 카드 목록 로드
  const loadCards = useCallback(() => {
    setCardLoading(true);
    const params = new URLSearchParams();
    if (cardFilter.team)   params.append('team', cardFilter.team);
    if (cardFilter.type)   params.append('type', cardFilter.type);
    if (cardFilter.league) params.append('league', cardFilter.league);
    if (cardFilter.grade)  params.append('grade', cardFilter.grade);
    if (cardFilter.search) params.append('search', cardFilter.search);
    params.append('sort', cardFilter.sort);

    fetch(`${API}/cards?${params}`, {
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      }
    })
      .then(r => r.json())
      .then(data => { setCardList(Array.isArray(data) ? data : []); setCardLoading(false); })
      .catch(() => setCardLoading(false));
  }, [cardFilter, authToken]);

  useEffect(() => {
    if (mainMode === 'cards' || mainMode === 'scouting') {
      loadCards();
    }
  }, [mainMode, loadCards]);

  // 선수 상세 로드
  const loadPlayerDetail = useCallback((player) => {
    setSelectedPlayer(player);
    fetch(`${API}/cards/${player.id}`, {
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      }
    })
      .then(r => r.json())
      .then(d => {
        setSelectedPlayerDetail(d);
        setScoutingMode('detail');
      }).catch(() => {});
  }, [authToken]);


  useEffect(() => {
    // Reset states when league changes
    setTeams([]);
    setPlayers({ hitters: [], pitchers: [] });
    setSchedule(null);
    setNews([]);
    setVisibleCount(10);
    setSubLeagues([]);
    setSelectedSubLeague('');
    if (selectedLeague !== 'kbo') setFavoriteTeam('Default');

    // Fetch sub-leagues for amateur
    if (selectedLeague === 'highschool' || selectedLeague === 'college') {
      const kind_cd = selectedLeague === 'highschool' ? '31' : '41';
      fetch(`${BASE_URL}/api/subleagues?kind_cd=${kind_cd}`)
        .then(res => res.json())
        .then(data => {
          setSubLeagues(data);
          if (data.length > 0) setSelectedSubLeague(data[0].id);
        });
    }
  }, [selectedLeague]);

  useEffect(() => {
    if (favoriteTeam === 'Default') {
      document.documentElement.style.setProperty('--accent', '#38bdf8');
      document.documentElement.style.setProperty('--accent-rgb', '56, 189, 248');
      document.documentElement.style.setProperty('--bg-color', '#0f172a');
      document.documentElement.style.setProperty('--header-bg', 'rgba(15, 23, 42, 0.95)');
      document.documentElement.style.setProperty('--panel-bg', 'rgba(30, 41, 59, 0.7)');
      document.documentElement.style.setProperty('--team-glow', 'none');
      document.body.style.background = '';
    } else {
      const color = TEAM_COLORS[favoriteTeam];
      // hex to rgb helper
      const r = parseInt(color.slice(1,3),16);
      const g = parseInt(color.slice(3,5),16);
      const b = parseInt(color.slice(5,7),16);
      document.documentElement.style.setProperty('--accent', color);
      document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
      document.documentElement.style.setProperty('--bg-color', `#0f172a`);
      document.documentElement.style.setProperty('--header-bg', `rgba(${r},${g},${b},0.85)`);
      document.documentElement.style.setProperty('--panel-bg', `rgba(${r},${g},${b},0.08)`);
      document.documentElement.style.setProperty('--team-glow', `0 0 40px rgba(${r},${g},${b},0.25)`);
      document.body.style.background = `radial-gradient(ellipse at top, rgba(${r},${g},${b},0.12) 0%, #0f172a 60%)`;
    }
  }, [favoriteTeam]);

  // Show More state
  const [visibleCount, setVisibleCount] = useState(10);
  const [visibleNewsCount, setVisibleNewsCount] = useState(5);

  // Roster Modal
  const [rosterData, setRosterData] = useState(null);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Injured Players
  const [injuredPlayers, setInjuredPlayers] = useState([]);
  const [showAllInjured, setShowAllInjured] = useState(false);

  // Entry / Exit Log
  const [entryExit, setEntryExit] = useState({ entry: [], exit: [] });

  useEffect(() => {
    if (selectedLeague === 'kbo') {
      fetch(`${BASE_URL}/api/injured`).then(r => r.json()).then(setInjuredPlayers).catch(() => {});
      fetch(`${BASE_URL}/api/entry-exit`).then(r => r.json()).then(setEntryExit).catch(() => {});
    }
  }, [selectedLeague]);

  const openRoster = useCallback((team) => {
    setSelectedRosterTeam(team);
    setRosterLoading(true);
    fetch(`${BASE_URL}/api/roster?team=${encodeURIComponent(team)}`)
      .then(r => r.json())
      .then(data => { setRosterData(data); setRosterLoading(false); })
      .catch(() => setRosterLoading(false));
  }, []);

  const closeRoster = useCallback(() => {
    setSelectedRosterTeam(null);
    setRosterData(null);
  }, []);

  // Chart Interactivity
  const [activeTeam, setActiveTeam] = useState(null);
  const [hiddenTeams, setHiddenTeams] = useState([]);

  useEffect(() => {
    const dateStr = currentDate.toISOString().split('T')[0];
    fetch(`${BASE_URL}/api/schedule?league=${selectedLeague}&date=${dateStr}&subLeagueId=${selectedSubLeague}`).then(res => res.json()).then(setSchedule).catch(e => console.error(e));
  }, [currentDate, selectedLeague, selectedSubLeague]);

  useEffect(() => {
    const subParam = selectedSubLeague ? `&subLeagueId=${selectedSubLeague}` : '';
    fetch(`${BASE_URL}/api/teams?league=${selectedLeague}${subParam}`).then(res => res.json()).then(setTeams).catch(e => console.error(e));
    fetch(`${BASE_URL}/api/players?league=${selectedLeague}${subParam}`).then(res => res.json()).then(setPlayers).catch(e => console.error(e));
    fetch(`${BASE_URL}/api/news?league=${selectedLeague}`).then(res => res.json()).then(setNews).catch(e => console.error(e));
  }, [selectedLeague, selectedSubLeague]);

  const handlePrevDate = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDate = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const toggleTeam = (e) => {
    const { dataKey } = e;
    if (hiddenTeams.includes(dataKey)) {
      setHiddenTeams(hiddenTeams.filter(t => t !== dataKey));
    } else {
      setHiddenTeams([...hiddenTeams, dataKey]);
    }
  };

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTeams = useMemo(() => {
    if (!Array.isArray(teams)) return [];
    let sortableItems = [...teams];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [teams, sortConfig]);

  const sortedHitters = useMemo(() => {
    let sortableItems = [...players.hitters];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [players.hitters, sortConfig]);

  const sortedPitchers = useMemo(() => {
    let sortableItems = [...players.pitchers];
    if (sortConfig.key) {
      const actualSortKey = sortConfig.key === 'ip' ? 'ipSort' : sortConfig.key;
      sortableItems.sort((a, b) => {
        if (a[actualSortKey] < b[actualSortKey]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[actualSortKey] > b[actualSortKey]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [players.pitchers, sortConfig]);

  const leagues = [
    { id: 'kbo', name: 'KBO 리그' },
    { id: 'futures', name: '퓨처스리그' },
    { id: 'highschool', name: '고교야구' },
    { id: 'college', name: '대학야구' }
  ];

  const leagueName = LEAGUE_NAMES[selectedLeague] || 'KBO Fan Scouting';

  useEffect(() => {
    if (mainMode === 'scouting') {
      if (scoutingMode === 'detail' && selectedPlayerDetail) {
        setFavoriteTeam(selectedPlayerDetail.team);
      } else if (cardFilter.team) {
        setFavoriteTeam(cardFilter.team);
      } else {
        setFavoriteTeam('Default');
      }
    } else {
      setFavoriteTeam('Default');
    }
  }, [mainMode, scoutingMode, selectedPlayerDetail, cardFilter.team]);

  // ─── 카드 도감 렌더 ───────────────────────────────────────────────────
  const renderCardCollection = () => (
    <div className="card-collection-view">
      {/* 필터 바 */}
      <div className="card-filter-bar">
        <div className="card-filter-search">
          <SearchIcon size={14} />
          <input
            type="text" placeholder="선수 이름 검색..."
            value={cardFilter.search}
            onChange={e => setCardFilter(f => ({ ...f, search: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && loadCards()}
          />
        </div>
        <select className="card-filter-select" value={cardFilter.type}
          onChange={e => setCardFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">전체 포지션</option>
          <option value="BATTER">타자</option>
          <option value="PITCHER">투수</option>
        </select>
        <select className="card-filter-select" value={cardFilter.league}
          onChange={e => setCardFilter(f => ({ ...f, league: e.target.value }))}>
          <option value="">1군+퓨처스</option>
          <option value="FIRST">1군</option>
          <option value="FUTURES">퓨처스</option>
        </select>
        <select className="card-filter-select" value={cardFilter.grade}
          onChange={e => setCardFilter(f => ({ ...f, grade: e.target.value }))}>
          <option value="">전체 등급</option>
          {['S','A','B','C','D'].map(g => <option key={g} value={g}>{g}등급</option>)}
        </select>
        <select className="card-filter-select" value={cardFilter.sort}
          onChange={e => setCardFilter(f => ({ ...f, sort: e.target.value }))}>
          <option value="overall">OVR 순</option>
          <option value="votes">평가 많은 순</option>
          <option value="grade">등급 순</option>
          <option value="name">이름 순</option>
        </select>
        <button className="card-filter-apply-btn" onClick={loadCards}>
          <Filter size={14} /> 적용
        </button>
      </div>

      {/* 카드 그리드 */}
      {cardLoading ? (
        <div className="card-loading"><div className="pulse-dot" /><span>카드 로딩 중...</span></div>
      ) : scoutingMode === 'detail' && selectedPlayerDetail ? (
        // 선수 상세 / 스카우팅 뷰
        <div className="player-detail-view">
          <button className="back-btn" onClick={() => { setScoutingMode('browse'); setSelectedPlayer(null); setSelectedPlayerDetail(null); }}>
            ← 도감으로 돌아가기
          </button>
          <div className="detail-layout">
            <div className="detail-card-side">
              <PlayerCard player={selectedPlayerDetail} myVote={selectedPlayerDetail.myVote} />
            </div>
            <div className="detail-info-side">
              <div className="detail-stats-summary">
                <h3>📊 팬 평가 현황</h3>
                <div className="detail-stat-row">
                  <span>참여자 수:</span>
                  <strong>{selectedPlayerDetail.vote_count || 0}명</strong>
                </div>
                <div className="detail-stat-row">
                  <span>점수 출처:</span>
                  <strong>{selectedPlayerDetail.score_source === 'FAN' ? '팬 주도' : selectedPlayerDetail.score_source === 'BLENDED' ? '혼합' : 'AI 추정치'}</strong>
                </div>
                {selectedPlayerDetail.std_dev > 15 && (
                  <div className="hot-take-alert">🔥 팬들 사이에서 의견이 많이 갈리는 선수!</div>
                )}
              </div>
              <ScoutingPanel
                player={selectedPlayerDetail}
                nickname={authUser?.nickname}
                token={authToken}
                onRequestNickname={() => setShowNickModal(true)}
                currentCard={selectedPlayerDetail}
                onSubmitSuccess={(data) => {
                  loadCards();
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="card-grid-header">
            <span className="card-count">{cardList.length}장의 카드</span>
          </div>
          <div className="card-grid">
            {cardList.map(p => (
              <PlayerCard key={p.id} player={p} compact onClick={loadPlayerDetail} myVote={p.myVote} />
            ))}
            {cardList.length === 0 && (
              <div className="card-empty">조건에 맞는 카드가 없습니다.</div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // ─── 스카우팅 탭 렌더 ─────────────────────────────────────────────────
  const renderScouting = () => (
    <div className="scouting-view">
      <div className="scouting-layout">
        {/* 오른쪽: 선수 카드 목록 + 스카우팅 */}
        <main className="scouting-main">
          {scoutingMode === 'detail' && selectedPlayerDetail ? (
            <div className="player-detail-view">
              <button className="neo-btn" style={{ margin: 0, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', color: 'var(--text-1)', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '20px' }} 
                onClick={() => { setScoutingMode('browse'); setSelectedPlayer(null); setSelectedPlayerDetail(null); }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              >
                <ChevronLeft size={16} /> 선수 목록으로
              </button>
              <div className="detail-layout">
                <div className="detail-card-side">
                  <PlayerCard player={selectedPlayerDetail} myVote={selectedPlayerDetail.myVote} />
                </div>
                <div className="detail-info-side">
                  <ScoutingPanel
                    player={selectedPlayerDetail}
                    nickname={authUser?.nickname}
                    token={authToken}
                    onRequestNickname={() => {}}
                    currentCard={selectedPlayerDetail}
                    onSubmitSuccess={(data) => {
                      loadCards();
                    }}
                  />
                </div>
              </div>
            </div>
          ) : !cardFilter.team ? (
            <div className="team-selection-view">
              <h2 className="team-selection-title">스카우팅 구단 선택</h2>
              <p className="team-selection-desc">평가할 선수가 소속된 구단을 선택해주세요.</p>
              <div className="team-grid">
                {['KIA', '삼성', 'LG', '두산', 'KT', 'SSG', '롯데', '한화', 'NC', '키움'].map(team => (
                  <div key={team} className="team-grid-item" onClick={() => setCardFilter(f => ({ ...f, team }))}>
                    <img src={TEAM_LOGOS[team]} alt={team} className="team-grid-logo" />
                    <span className="team-grid-name">{team}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="scouting-back-header" style={{ padding: '0 20px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                <button className="neo-btn" style={{ margin: 0, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', color: 'var(--text-1)', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }} 
                  onClick={() => setCardFilter(f => ({...f, team: ''}))}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#000'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                >
                  <ChevronLeft size={16} /> 구단 선택으로
                </button>
              </div>
              <div className="card-grid scouting-grid">
                {cardList.map(p => (
                  <PlayerCard key={p.id} player={p} compact onClick={(pl) => {
                    setMainMode('scouting');
                    loadPlayerDetail(pl);
                  }} myVote={p.myVote} />
                ))}
                {cardList.length === 0 && <div className="card-empty">선수가 없습니다.</div>}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );



  return (
    <div className={`app-container ${favoriteTeam !== 'Default' ? 'custom-theme' : ''}`}>
      {/* 상단 네비게이션 삭제됨 */}

      {/* Background Watermark */}
      {selectedLeague === 'kbo' && favoriteTeam !== 'Default' ? (
        <div 
          className="bg-watermark" 
          style={{ backgroundImage: `url(${TEAM_LOGOS[favoriteTeam]})` }}
        />
      ) : (
        <div 
          className="bg-watermark generic-watermark" 
          style={{ backgroundImage: 'url(/logos/kbo_logo.png)', opacity: 0.03 }}
        />
      )}

      <header className="header">
        <div className="logo-section">
          {LEAGUE_LOGOS[selectedLeague] && (
            <img
              src={LEAGUE_LOGOS[selectedLeague]}
              alt={leagueName}
              style={{ height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
          <h1>{leagueName}</h1>
        </div>
        
        <div className="header-actions">
          {authToken && authUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-1)', fontWeight: 'bold' }}>
                👤 {authUser.nickname}
              </span>
              <button 
                onClick={() => {
                  localStorage.removeItem('kbo_token');
                  localStorage.removeItem('kbo_user');
                  setAuthToken(null);
                  setAuthUser(null);
                }}
                style={{ 
                  background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.85rem',
                  cursor: 'pointer', padding: '0 4px'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 메인 모드 네비게이션 삭제됨 */}

      {/* 카드 도감 뷰 */}
      {mainMode === 'cards' && renderCardCollection()}

      {/* 스플래시 로그인 오버레이 */}
      {!authToken && <SplashLogin onLogin={handleLogin} />}

      {/* 스카우팅 뷰 */}
      {mainMode === 'scouting' && renderScouting()}

      {/* 기존 대시보드 */}
      {mainMode === 'dashboard' && selectedLeague === 'kbo' && (
        <section className="trend-section">
          <div className="panel trend-panel">
            <div className="panel-header">
              <Activity className="text-accent" size={20} />
              <h2>KBO 순위 그래프</h2>
            </div>
            <div className="chart-container" style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={GAME_DIFF_TREND_DATA} margin={{ right: 40, top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis reversed stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(11,14,20,0.95)', border: '1px solid #30363d', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(val, name) => [val.toFixed(1) + '게임차', name]}
                  />
                  {Object.keys(TEAM_COLORS).map(team => (
                    <Line 
                      key={team} 
                      type="monotone" 
                      dataKey={team} 
                      stroke={TEAM_COLORS[team]} 
                      strokeWidth={activeTeam === team ? 4 : (activeTeam ? 1 : 2)} 
                      strokeOpacity={hiddenTeams.includes(team) ? 0 : (activeTeam && activeTeam !== team ? 0.2 : 1)}
                      dot={hiddenTeams.includes(team) ? false : { r: 3 }} 
                      activeDot={{ r: 6 }} 
                      onMouseEnter={() => setActiveTeam(team)}
                      onMouseLeave={() => setActiveTeam(null)}
                      label={hiddenTeams.includes(team) ? null : <CustomizedLabel data={GAME_DIFF_TREND_DATA} team={team} />}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {mainMode === 'dashboard' && <div className="dashboard-grid">
        <aside className="panel left-panel">
          <div className="panel-header">
            <Calendar size={16} className="text-accent" />
            <h2>{schedule ? schedule.date : '경기 일정'}</h2>
            <div className="date-nav">
              <button className="date-btn" onClick={handlePrevDate}><ChevronLeft size={13} /></button>
              <button className="date-btn" onClick={handleNextDate}><ChevronRight size={13} /></button>
            </div>
            <div className="panel-dot" style={{ marginLeft: '4px' }}></div>
          </div>
          <div className="schedule-list">
            {schedule && schedule.matches.length > 0 ? schedule.matches.map((match, i) => (
              <a
                key={i}
                className={`match-card ${match.isUpcoming ? 'upcoming' : ''} ${match.naverUrl ? 'clickable' : ''}`}
                href={match.naverUrl || undefined}
                target={match.naverUrl ? '_blank' : undefined}
                rel="noopener noreferrer"
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="match-info">
                  <span className="match-time">{match.isUpcoming ? match.fullDate : match.time}</span>
                  <span className="match-stadium">{match.stadium}</span>
                  {match.leagueName && <span className="match-league-tag">{match.leagueName}</span>}
                  {match.naverUrl && <ExternalLink size={10} style={{ opacity: 0.4, marginLeft: 4 }} />}
                </div>
                {match.isUpcoming && <div className="upcoming-badge">UPCOMING</div>}
                <div className="match-score-row">
                  <div className="team-info">
                    {getTeamLogo(match.away) && (
                      <img src={getTeamLogo(match.away)} alt={match.away} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    )}
                    <span className="team-name">{match.away}</span>
                    {match.awayStarter && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{match.awayStarter}</span>}
                  </div>
                  <div className="score-stack">
                    <span className="match-score">{match.score.split(' (')[0]}</span>
                    {match.score.includes('(') && (
                      <span className="match-status-small">({match.score.split('(')[1]}</span>
                    )}
                  </div>
                  <div className="team-info">
                    {getTeamLogo(match.home) && (
                      <img src={getTeamLogo(match.home)} alt={match.home} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                    )}
                    <span className="team-name">{match.home}</span>
                    {match.homeStarter && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{match.homeStarter}</span>}
                  </div>
                </div>
              </a>
            )) : (
              <div className="empty-state">해당 날짜에 경기가 없습니다.</div>
            )}
          </div>

          {selectedLeague === 'kbo' && (entryExit.entry.length > 0 || entryExit.exit.length > 0) && (
            <div className="entry-exit-panel" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <div className="panel-header" style={{ marginBottom: '1rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} className="text-accent" />
                  <h2 style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>엔트리 변동 리포트 <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{entryExit.date || '실시간'}</span></h2>
                  <div className="panel-dot" style={{ marginLeft: '4px' }}></div>
                </div>
                <a 
                  href="https://www.koreabaseball.com/Player/RegisterAll.aspx" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.65rem', color: 'var(--accent)', textDecoration: 'none', background: 'rgba(var(--accent-rgb), 0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}
                >
                  KBO 공식현황
                </a>
              </div>
              
              <div className="entry-exit-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {entryExit.entry.length > 0 && (
                  <div className="entry-section">
                    <h3 style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                      <Plus size={12} strokeWidth={3} /> Call-up 등록 ({entryExit.entry.length})
                    </h3>
                    <div className="entry-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                      {entryExit.entry.map((p, i) => (
                        <a 
                          key={i} 
                          href="https://www.koreabaseball.com/Player/RegisterAll.aspx"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '8px', textAlign: 'center', textDecoration: 'none', color: 'inherit', transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--success)'}
                          onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.25)'}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>{p.name}</div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>{p.team} · {p.pos}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {entryExit.exit.length > 0 && (
                  <div className="exit-section">
                    <h3 style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                      <X size={12} strokeWidth={3} /> Send-down 말소 ({entryExit.exit.length})
                    </h3>
                    <div className="exit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                      {entryExit.exit.map((p, i) => (
                        <a 
                          key={i} 
                          href="https://www.koreabaseball.com/Player/RegisterAll.aspx"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '8px', textAlign: 'center', textDecoration: 'none', color: 'inherit', transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.borderColor = '#ef4444'}
                          onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>{p.name}</div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>{p.team} · {p.pos}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        <main className="panel center-panel">
          <div className="panel-header">
            <LayoutDashboard className="text-accent" size={16} />
            <h2>팀 및 선수 기록</h2>
            <div className="panel-dot" style={{ marginLeft: '4px' }}></div>
          </div>
          <div className="tabs">
            <div className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>팀 전체 순위</div>
            <div className={`tab ${activeTab === 'hitters' ? 'active' : ''}`} onClick={() => {setActiveTab('hitters'); setVisibleCount(10);}}>타자 기록</div>
            <div className={`tab ${activeTab === 'pitchers' ? 'active' : ''}`} onClick={() => {setActiveTab('pitchers'); setVisibleCount(10);}}>투수 기록</div>
          </div>
          <div className="table-container">
            {activeTab === 'teams' && (
              <>
                {teams.isGrouped ? (
                  Object.entries(teams.groups).map(([divName, divTeams], groupIdx) => (
                    <div key={groupIdx} className="division-section" style={{ marginBottom: '2rem' }}>
                      <h3 className="division-title" style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={18} /> {divName}
                      </h3>
                      <table>
                        <thead>
                          <tr>
                            <th>순위</th>
                            <th>팀명</th>
                            <th>경기</th>
                            <th>승</th>
                            <th>무</th>
                            <th>패</th>
                            <th>승률</th>
                            <th>경기차</th>
                            <th>연속</th>
                          </tr>
                        </thead>
                        <tbody>
                          {divTeams.map((team, i) => (
                            <tr key={i}>
                              <td>{team.rank}</td>
                              <td className="team-cell">
                                {getTeamLogo(team.name) ? (
                                  <img src={getTeamLogo(team.name)} alt={team.name} className="team-logo-small" />
                                ) : (
                                  <div className="team-placeholder">{team.name.charAt(0)}</div>
                                )}
                                <span>{team.name}</span>
                              </td>
                              <td>{team.games}</td>
                              <td>{team.wins}</td>
                              <td>{team.draws}</td>
                              <td>{team.losses}</td>
                              <td>{team.winRate.toFixed(3)}</td>
                              <td>{team.gameDiff}</td>
                              <td style={{ color: team.streak.includes('승') ? 'var(--success)' : 'var(--danger)' }}>{team.streak}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => requestSort('rank')}>순위 {sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</th>
                        <th>팀명</th>
                        <th onClick={() => requestSort('games')}>경기 {sortConfig.key === 'games' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</th>
                        <th onClick={() => requestSort('wins')}>승 {sortConfig.key === 'wins' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</th>
                        <th onClick={() => requestSort('draws')}>무 {sortConfig.key === 'draws' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</th>
                        <th onClick={() => requestSort('losses')}>패 {sortConfig.key === 'losses' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</th>
                        <th onClick={() => requestSort('winRate')}>승률 {sortConfig.key === 'winRate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</th>
                        <th onClick={() => requestSort('gameDiff')}>경기차 {sortConfig.key === 'gameDiff' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}</th>
                        <th>연속</th>
                        {selectedLeague === 'kbo' && <th>로스터</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team, i) => (
                        <tr key={i} style={{ cursor: selectedLeague === 'kbo' ? 'default' : 'default' }}>
                          <td>{team.rank}</td>
                          <td className="team-cell">
                            {getTeamLogo(team.name) ? (
                              <img src={getTeamLogo(team.name)} alt={team.name} className="team-logo-small" />
                            ) : (
                              <div className="team-placeholder">{team.name.charAt(0)}</div>
                            )}
                            <span>{team.name}</span>
                          </td>
                          <td>{team.games}</td>
                          <td>{team.wins}</td>
                          <td>{team.draws}</td>
                          <td>{team.losses}</td>
                          <td>{team.winRate.toFixed(3)}</td>
                          <td>{team.gameDiff}</td>
                          <td style={{ color: team.streak.includes('승') ? 'var(--success)' : 'var(--danger)' }}>{team.streak}</td>
                          {selectedLeague === 'kbo' && (
                            <td>
                              <button
                                className="roster-btn"
                                onClick={() => openRoster(team.name)}
                                title={`${team.name} 로스터 보기`}
                              >
                                <Users size={12} /> 로스터
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
            {activeTab === 'hitters' && (
              <>
              <table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>팀</th>
                    <th onClick={() => requestSort('g')}>G</th>
                    <th onClick={() => requestSort('ab')}>타수</th>
                    <th onClick={() => requestSort('h')}>안타</th>
                    <th onClick={() => requestSort('avg')}>타율</th>
                    <th onClick={() => requestSort('hr')}>홈런</th>
                    <th onClick={() => requestSort('rbi')}>타점</th>
                    <th onClick={() => requestSort('sb')}>도루</th>
                    <th onClick={() => requestSort('bb')}>볼넷</th>
                    <th onClick={() => requestSort('ops')}>OPS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHitters.slice(0, visibleCount).map((h, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold' }}>
                        <a
                          href={getPlayerLink(h, selectedLeague, false)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="player-link"
                        >{h.name} <ExternalLink size={10} style={{ opacity: 0.5 }} /></a>
                      </td>
                      <td className="team-cell">
                        {getTeamLogo(h.team) ? (
                          <img src={getTeamLogo(h.team)} alt={h.team} className="team-logo-small" />
                        ) : (
                          <div className="team-placeholder">{h.team.charAt(0)}</div>
                        )}
                        <span>{h.team}</span>
                      </td>
                      <td>{h.g}</td>
                      <td>{h.ab}</td>
                      <td>{h.h}</td>
                      <td>{h.avg.toFixed(3)}</td>
                      <td>{h.hr}</td>
                      <td>{h.rbi}</td>
                      <td>{h.sb}</td>
                      <td>{h.bb}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{h.ops.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedHitters.length > visibleCount && (
                <div className="show-more" onClick={() => setVisibleCount(visibleCount + 20)}>
                  <Plus size={16} /> 더보기 ({sortedHitters.length - visibleCount}명 남음)
                </div>
              )}
              </>
            )}
            {activeTab === 'pitchers' && (
              <>
              <table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>팀</th>
                    <th onClick={() => requestSort('g')}>G</th>
                    <th onClick={() => requestSort('era')}>ERA</th>
                    <th onClick={() => requestSort('win')}>승</th>
                    <th onClick={() => requestSort('loss')}>패</th>
                    <th onClick={() => requestSort('sv')}>세</th>
                    <th onClick={() => requestSort('hld')}>홀</th>
                    <th onClick={() => requestSort('ip')}>이닝</th>
                    <th onClick={() => requestSort('h')}>피안타</th>
                    <th onClick={() => requestSort('hr_a')}>피홈런</th>
                    <th onClick={() => requestSort('bb')}>볼넷</th>
                    <th onClick={() => requestSort('so')}>탈삼진</th>
                    <th onClick={() => requestSort('fip')}>FIP</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPitchers.slice(0, visibleCount).map((p, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold' }}>
                        <a
                          href={getPlayerLink(p, selectedLeague, true)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="player-link"
                        >{p.name} <ExternalLink size={10} style={{ opacity: 0.5 }} /></a>
                      </td>
                      <td className="team-cell">
                        {getTeamLogo(p.team) ? (
                          <img src={getTeamLogo(p.team)} alt={p.team} className="team-logo-small" />
                        ) : (
                          <div className="team-placeholder">{p.team.charAt(0)}</div>
                        )}
                        <span>{p.team}</span>
                      </td>
                      <td>{p.g}</td>
                      <td>{p.era.toFixed(2)}</td>
                      <td>{p.win}</td>
                      <td>{p.loss}</td>
                      <td>{p.sv}</td>
                      <td>{p.hld}</td>
                      <td>{p.ip}</td>
                      <td>{p.h}</td>
                      <td>{p.hr_a}</td>
                      <td>{p.bb}</td>
                      <td>{p.so}</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{p.fip.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedPitchers.length > visibleCount && (
                <div className="show-more" onClick={() => setVisibleCount(visibleCount + 20)}>
                  <Plus size={16} /> 더보기 ({sortedPitchers.length - visibleCount}명 남음)
                </div>
              )}
              </>
            )}
          </div>
        </main>

        <aside className="panel right-panel">
          <div className="panel-header">
            <Newspaper className="text-accent" size={16} />
            <h2>실시간 {leagues.find(l => l.id === selectedLeague)?.name} 뉴스</h2>
            <div className="panel-dot" style={{ marginLeft: '4px' }}></div>
          </div>
          <div className="news-list">
            {news.slice(0, visibleNewsCount).map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="news-item">
                <span className="news-source">{item.source} <ExternalLink size={10} /></span>
                <p className="news-title">{item.title}</p>
                <span className="news-time">{item.time}</span>
              </a>
            ))}
            {news.length > visibleNewsCount && (
              <div className="show-more" onClick={() => setVisibleNewsCount(visibleNewsCount + 5)}>
                <Plus size={14} /> 더보기 ({news.length - visibleNewsCount}건 더 있음)
              </div>
            )}
          </div>

          {selectedLeague === 'kbo' && injuredPlayers.length > 0 && (
            <div className="injured-panel">
              <div className="injured-header">
                <AlertTriangle size={15} className="injured-icon" />
                <span>부상자 현황 IL</span>
                <span className="injured-count">{injuredPlayers.length}명</span>
              </div>
              <div className="injured-list">
                {(showAllInjured ? injuredPlayers : injuredPlayers.slice(0, 4)).map((p, i) => {
                  const today = new Date();
                  const [m, d] = p.startDate.split('.');
                  const start = new Date(today.getFullYear(), parseInt(m) - 1, parseInt(d));
                  const diffTime = today - start;
                  const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                  const totalDays = parseInt(p.ilDays.replace(/[^0-9]/g, '')) || 10;
                  const pct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
                  const isEligible = pct >= 100;
                  
                  return (
                    <a
                      key={i}
                      href={p.newsLink || `https://search.naver.com/search.naver?where=news&query=야구선수+${encodeURIComponent(p.name)}+부상`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="injured-item"
                    >
                      <div className="injured-item-header">
                        <div className="injured-team-name">
                          {getTeamLogo(p.team) && <img src={getTeamLogo(p.team)} alt={p.team} className="team-logo-tiny" />}
                          <span className="injured-name">{p.name}</span>
                          <span className={`injured-status-badge ${isEligible ? 'near-return' : ''}`}>{isEligible ? '복귀 가능' : p.status}</span>
                        </div>
                        <span className="injured-weeks" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{p.ilDays}</span>
                      </div>
                      <p className="injured-type" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{p.injuryName}</p>
                      
                      <div className="injured-progress-bar">
                        <div
                          className={`injured-progress-fill ${isEligible ? 'near-return' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <span>등재: {p.startDate}</span>
                        <span>{elapsedDays}일 경과 / {totalDays}일</span>
                      </div>
                    </a>
                  );
                })}
              </div>
              {injuredPlayers.length > 4 && (
                <button className="injured-toggle" onClick={() => setShowAllInjured(v => !v)}>
                  {showAllInjured ? <><ChevronUp size={13} /> 접기</> : <><ChevronDown size={13} /> {injuredPlayers.length - 4}명 더 보기</>}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>}

      {/* 로스터 모달 */}
      {selectedRosterTeam && (
        <div className="roster-modal-overlay" onClick={closeRoster}>
          <div className="roster-modal" onClick={e => e.stopPropagation()}>
            <div className="roster-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {getTeamLogo(selectedRosterTeam) && (
                  <img src={getTeamLogo(selectedRosterTeam)} alt={selectedRosterTeam} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedRosterTeam}</h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>2026 시즌 1군 로스터</p>
                </div>
              </div>
              <button className="roster-modal-close" onClick={closeRoster}><X size={20} /></button>
            </div>

            {rosterLoading ? (
              <div className="roster-loading">
                <div className="pulse-dot"></div>
                <span>로스터 불러오는 중...</span>
              </div>
            ) : rosterData ? (
              <div className="roster-modal-body">
                <div className="roster-section">
                  <h3 className="roster-section-title"><Shield size={14} /> 타자 ({rosterData.hitters?.length || 0}명)</h3>
                  <div className="roster-grid">
                    {(rosterData.hitters || []).sort((a,b) => a.no - b.no).map((p, i) => (
                      <a
                        key={i}
                        href={`https://m.sports.naver.com/player/index?from=nx&playerId=${p.playerId}&category=kbo&tab=record`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="roster-player-card"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="roster-player-img"
                          onError={e => { e.target.src = `https://ssl.pstatic.net/sstatic/sports/blank_player.png`; }}
                        />
                        <div className="roster-player-info">
                          <span className="roster-player-no">#{Math.floor(p.no)}</span>
                          <span className="roster-player-name">{p.name}</span>
                        </div>
                        <ExternalLink size={9} style={{ opacity: 0.4 }} />
                      </a>
                    ))}
                  </div>
                </div>
                <div className="roster-section">
                  <h3 className="roster-section-title"><Activity size={14} /> 투수 ({rosterData.pitchers?.length || 0}명)</h3>
                  <div className="roster-grid">
                    {(rosterData.pitchers || []).sort((a,b) => a.no - b.no).map((p, i) => (
                      <a
                        key={i}
                        href={`https://m.sports.naver.com/player/index?from=nx&playerId=${p.playerId}&category=kbo&tab=record`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="roster-player-card"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="roster-player-img"
                          onError={e => { e.target.src = `https://ssl.pstatic.net/sstatic/sports/blank_player.png`; }}
                        />
                        <div className="roster-player-info">
                          <span className="roster-player-no">#{Math.floor(p.no)}</span>
                          <span className="roster-player-name">{p.name}</span>
                        </div>
                        <ExternalLink size={9} style={{ opacity: 0.4 }} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Footer Disclaimer */}
      <footer className="app-footer">
        <p>본 서비스는 개인이 취미로 운영하는 비공식 사이트이며, KBO 및 각 프로야구 구단과 어떠한 상업적 관계도 없고 무관함을 밝힙니다.</p>
        <p>본 사이트 내의 기록 및 평가는 팬들의 주관적인 의견에 기반합니다.</p>
      </footer>

    </div>
  );
}

export default App;

