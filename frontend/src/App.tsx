import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Trophy, MapPin, Building2, RefreshCw, Menu, X, Table, History, Ticket, Users, Target, ChevronLeft, PlayCircle, Info, List } from 'lucide-react'

interface Team {
  id: number;
  name: string;
  city: string;
  stadiumName: string;
  stadiumUrl: string;
  logoUrl: string;
  points: number;
}

interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: { name: string; shortName: string; crest: string };
  awayTeam: { name: string; shortName: string; crest: string };
  score: { 
    fullTime: { home: number; away: number };
    halfTime?: { home: number; away: number };
  };
}

interface Player {
  id: number;
  name: string;
  shirtNumber: number;
  position?: string;
}

interface Goal {
  minute: number;
  extraTime?: number | null;
  type: string;
  team: { id: number; name: string; logo?: string };
  player: { id: number; name: string };
  assist?: { id: number; name: string } | null;
}

interface Substitution {
  minute: number;
  extraTime?: number | null;
  team: { id: number; name: string; logo?: string };
  playerOut: { id: number; name: string };
  playerIn: { id: number; name: string };
}

// ---------------------------------------

interface FreeApiMatch {
  id?: string;
  matchId?: string;
  pageUrl?: string;
  time?: string;
  date?: string;
  status?: {
    utcTime?: string;
    finished?: boolean;
    started?: boolean;
    cancelled?: boolean;
    awarded?: boolean;
    scoreStr?: string;
    reason?: string;
  };
  home?: { name: string; logo: string; score: number };
  away?: { name: string; logo: string; score: number };
  homeTeam?: { name: string; logo: string; score: number };
  awayTeam?: { name: string; logo: string; score: number };
  stats?: {
    possession?: { home: number; away: number };
    shots?: { home: number; away: number };
    shotsOnGoal?: { home: number; away: number };
  };
}

interface FreeApiResponse {
  status: string;
  response: {
    matches: FreeApiMatch[];
  };
}

interface AfResponse {
  response: Array<{
// ... rest of AfResponse ...
    fixture: {
      id: number;
      date: string;
      venue: { name: string };
      status: { long: string };
    };
    league: { round: string };
    teams: {
      home: { id: number; name: string; logo: string };
      away: { id: number; name: string; logo: string };
    };
    goals: { home: number; away: number };
    lineups: Array<{
      team: { id: number };
      formation: string;
      startXI: Array<{ player: { id: number; name: string; number: number; pos: string } }>;
      substitutes: Array<{ player: { id: number; name: string; number: number; pos: string } }>;
    }>;
    statistics: Array<{
      team: { id: number };
      statistics: Array<{ type: string; value: string | number | null }>;
    }>;
    events: Array<{
      time: { elapsed: number; extra: number | null };
      team: { id: number; name: string };
      player: { id: number; name: string };
      type: string;
      detail: string;
    }>;
  }>;
}
// ---------------------------------------

interface TeamMatchInfo {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  formation?: string;
  lineup?: Player[];
  bench?: Player[];
  substitutions?: Substitution[];
}

interface MatchDetails extends Omit<Match, 'homeTeam' | 'awayTeam'> {
  venue?: string;
  referees?: { name: string }[];
  homeTeam: TeamMatchInfo;
  awayTeam: TeamMatchInfo;
  goals?: Goal[];
  substitutions?: Substitution[];
  statistics?: Record<string, { home: number; away: number }>;
}

interface Scorer {
  player: { id: number; name: string };
  team: { name: string; crest: string };
  goals: number;
}

interface FreeApiEvent {
  type: string;
  time?: number;
  minute?: number;
  elapsed?: number;
  overtime?: number | null;
  extraTime?: number | null;
  event_minute?: number;
  event_extra_minute?: number | null;
  text?: string;
  event_type?: string;
  isHome?: boolean;
  side?: 'home' | 'away';
  team_id?: number;
  playerName?: string;
  player?: { name: string };
  event_player?: string;
}

interface FreeApiPlayer {
  id?: number;
  playerId?: number;
  name?: string;
  playerName?: string;
  player?: { name: string };
  number?: number;
  shirtNumber?: number;
  jerseyNumber?: number;
  position?: string;
  pos?: string;
}

interface FreeApiLineup {
  formation?: string;
  system?: string;
  startXI?: FreeApiPlayer[];
  startingLineup?: FreeApiPlayer[];
  players?: FreeApiPlayer[];
  substitutes?: FreeApiPlayer[];
  bench?: FreeApiPlayer[];
}

interface FreeApiDetailsResponse {
  status: string;
  response: {
    detail?: {
      matchId?: string;
      matchTimeUTCDate?: string;
      referee?: string | { name?: string; fullName?: string };
      events?: FreeApiEvent[];
    };
    referee?: string | { name?: string; fullName?: string };
    ref?: { name?: string; fullName?: string };
    events?: FreeApiEvent[];
    matchEvents?: FreeApiEvent[];
    matchHistory?: FreeApiEvent[];
    eventlist?: FreeApiEvent[];
    incidents?: FreeApiEvent[];
    timeline?: FreeApiEvent[];
    all_events?: FreeApiEvent[];
    match_events?: FreeApiEvent[];
    matchInfo?: {
      referee?: string | { name?: string };
    };
    lineups?: {
      home?: FreeApiLineup;
      away?: FreeApiLineup;
    };
    teams?: FreeApiLineup[];
    matchLineups?: {
      home?: FreeApiLineup;
      away?: FreeApiLineup;
    };
    matchTime?: string;
    date?: string;
    matchReferee?: string | { name?: string; fullName?: string };
  };
}

interface FreeApiStatItem {
  key?: string;
  title?: string;
  type?: string;
  stats?: Array<string | number>;
  values?: Array<string | number>;
  value?: Array<string | number>;
  home?: string | number;
  away?: string | number;
}

interface FreeApiStatsGroup {
  title?: string;
  key?: string;
  stats?: FreeApiStatItem[];
  statistics?: FreeApiStatItem[];
}

interface FreeApiStatsResponse {
  status: string;
  response: {
    stats?: Array<FreeApiStatsGroup | FreeApiStatItem>;
    statistics?: Array<FreeApiStatsGroup | FreeApiStatItem>;
    match_stats?: Array<FreeApiStatsGroup | FreeApiStatItem>;
    data?: Array<FreeApiStatsGroup | FreeApiStatItem>;
  };
}

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isSynced, setIsSynced] = useState(true);
  const [showScorers, setShowScorers] = useState(false);
  const [activeTab, setActiveTab] = useState<'classifica' | 'partite' | 'squadre'>('classifica');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterSeason, setFilterSeason] = useState<number>(2024);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'FINISHED' | 'SCHEDULED' | 'TIMED' | 'IN_PLAY'>('ALL');

  const fetchTeams = useCallback(async () => {
    try {
      const response = await axios.get<Team[]>('http://localhost:8080/api/teams');
      const sortedTeams = response.data.sort((a, b) => b.points - a.points);
      setTeams(sortedTeams);
    } catch (error) {
      console.error('Errore nel caricamento dei team:', error);
    }
  }, []);

  const fetchMatches = useCallback(async (season?: number) => {
    try {
      const url = `http://localhost:8080/api/teams/matches${season ? `?season=${season}` : ''}`;
      const response = await axios.get<{ matches: Match[] }>(url);
      // Ordiniamo le partite per data
      const sortedMatches = response.data.matches.sort((a, b) => 
        new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );
      setMatches(sortedMatches);
    } catch (error) {
      console.error('Errore nel caricamento delle partite:', error);
    }
  }, []);

  const fetchScorers = useCallback(async () => {
    try {
      const response = await axios.get<{ scorers: Scorer[] }>('http://localhost:8080/api/teams/scorers');
      setScorers(response.data.scorers);
    } catch (error) {
      console.error('Errore nel caricamento dei capocannonieri:', error);
    }
  }, []);

  const fetchMatchDetails = useCallback(async (id: number) => {
    setSelectedMatchId(id);
    setLoadingDetails(true);
    setMatchDetails(null);
    
    const selectedMatch = matches.find(m => m.id === id);
    if (!selectedMatch) {
      console.error("Match non trovato localmente");
      setLoadingDetails(false);
      return;
    }

    const homeSearch = selectedMatch.homeTeam.shortName || selectedMatch.homeTeam.name;
    const awaySearch = selectedMatch.awayTeam.shortName || selectedMatch.awayTeam.name;
    const homeTeamData = teams.find(t => homeSearch.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(homeSearch.toLowerCase()));
    const awayTeamData = teams.find(t => awaySearch.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(awaySearch.toLowerCase()));

    const baseMatchDetails: MatchDetails = {
      ...selectedMatch,
      venue: homeTeamData?.stadiumName || 'Stadio non specificato',
      homeTeam: {
        id: homeTeamData?.id || 0,
        name: selectedMatch.homeTeam.name,
        shortName: selectedMatch.homeTeam.shortName,
        crest: homeTeamData?.logoUrl || selectedMatch.homeTeam.crest,
        lineup: [],
        bench: []
      },
      awayTeam: {
        id: awayTeamData?.id || 0,
        name: selectedMatch.awayTeam.name,
        shortName: selectedMatch.awayTeam.shortName,
        crest: awayTeamData?.logoUrl || selectedMatch.awayTeam.crest,
        lineup: [],
        bench: []
      },
      statistics: {
        'Possesso Palla': { home: 0, away: 0 },
        'Tiri Totali': { home: 0, away: 0 },
        'Tiri in Porta': { home: 0, away: 0 }
      }
    };

    setMatchDetails(baseMatchDetails);

    try {
      console.log(`DEBUG: Inizio recupero dati per match ID: ${id}`);
      const response = await axios.get<FreeApiResponse | AfResponse | { error: string } | Record<string, unknown>>(`http://localhost:8080/api/teams/matches/${id}`);
      const responseData = response.data;
      console.log("DEBUG: Risposta API ricevuta:", responseData);

      // Se Football-Data fallisce (es. errore 429), logghiamo ma non blocchiamo tutto se possibile
      if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
        console.warn("DEBUG: Backend ha restituito un errore:", responseData.error);
        // Se l'errore è 429, lanciamo comunque l'errore per ora, ma il backend andrebbe corretto
        throw new Error(String(responseData.error));
      }

      const isFreeApiResponse = (data: unknown): data is FreeApiResponse => {
        return typeof data === 'object' && data !== null && 'status' in data && (data as FreeApiResponse).status === 'success';
      };

      if (isFreeApiResponse(responseData)) {
        console.log("DEBUG: Formato identificato come FreeApiResponse");
        const apiMatches = responseData.response.matches;
        console.log(`DEBUG: Numero match trovati nell'API: ${apiMatches?.length || 0}`);
        
        const cleanName = (name: string) => {
          return name.toLowerCase()
            .replace(/^(us|ssc|ac|as|fc|cfc|ca|ud|cd)\s+/i, '')
            .replace(/\s+(fc|ac|as|ssc|us|cfc|ca|ud|cd)$/i, '')
            .replace(/calcio/gi, '')
            .trim();
        };

        const currentMatch = apiMatches.find((m: FreeApiMatch) => {
          const homeName = m.home?.name || m.homeTeam?.name || '';
          const awayName = m.away?.name || m.awayTeam?.name || '';
          
          if (!homeName || !awayName) return false;

          const mHome = cleanName(homeName);
          const mAway = cleanName(awayName);
          const hTarget = cleanName(homeSearch);
          const aTarget = cleanName(awaySearch);
          
          const nameMatch = (mHome.includes(hTarget) || hTarget.includes(mHome)) && 
                           (mAway.includes(aTarget) || aTarget.includes(mAway));
          
          return nameMatch;
        });

        if (!currentMatch) {
          console.log("DEBUG: Match non trovato. Nomi cercati:", { homeSearch, awaySearch });
          if (apiMatches.length > 0) {
            console.log("DEBUG: Esempio primo match API:", {
              id: apiMatches[0].id || apiMatches[0].matchId,
              home: apiMatches[0].home?.name || apiMatches[0].homeTeam?.name,
              away: apiMatches[0].away?.name || apiMatches[0].awayTeam?.name
            });
          }
        }

        if (currentMatch) {
          console.log("DEBUG: Match trovato nell'elenco!", currentMatch);
          const externalId = currentMatch.id || currentMatch.matchId;
          
          // Pre-carichiamo i dati che abbiamo già dalla lista
          setMatchDetails(prev => {
            if (!prev) return null;
            return {
              ...prev,
              score: {
                fullTime: { 
                  home: currentMatch.home?.score ?? currentMatch.homeTeam?.score ?? 0, 
                  away: currentMatch.away?.score ?? currentMatch.awayTeam?.score ?? 0 
                },
                halfTime: { home: 0, away: 0 }
              },
              status: currentMatch.status?.finished ? 'FINISHED' : 'SCHEDULED'
            };
          });

          if (!externalId) {
            console.warn("DEBUG: Match trovato ma ID esterno mancante. Uso solo dati base.");
            setLoadingDetails(false);
            return;
          }
          
          console.log(`DEBUG: [MATCH FOUND] externalId: ${externalId}`);
          console.log(`DEBUG: [API CALL] Details: http://localhost:8080/api/teams/matches/external/${externalId}`);
          console.log(`DEBUG: [API CALL] Stats: http://localhost:8080/api/teams/matches/stats/${externalId}`);
          
          const [detailsRes, statsRes] = await Promise.allSettled([
            axios.get<FreeApiDetailsResponse>(`http://localhost:8080/api/teams/matches/external/${externalId}`),
            axios.get<FreeApiStatsResponse>(`http://localhost:8080/api/teams/matches/stats/${externalId}`)
          ]);
          
          const detailsData = detailsRes.status === 'fulfilled' ? detailsRes.value.data : null;
          const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : null;
          
          console.log("DEBUG: Contenuto 'data' dettagli:", detailsData);
          console.log("DEBUG: Contenuto 'data' statistiche:", statsData);

          let apiGoals: Goal[] = [];
          let refereeName = '';
          let matchDateFromApi = '';
          let homeLineup: Player[] = [];
          let awayLineup: Player[] = [];
          let homeBench: Player[] = [];
          let awayBench: Player[] = [];
          let homeFormation = '';
          let awayFormation = '';

          // Cerchiamo di estrarre più dati possibili dal match della lista se mancano i dettagli
          const scoreHome = currentMatch.home?.score ?? currentMatch.homeTeam?.score;
          const scoreAway = currentMatch.away?.score ?? currentMatch.awayTeam?.score;

          if (detailsData?.response) {
            const resp = detailsData.response;
            
            // 1. Estrai arbitro
            const refData = resp.referee || resp.ref || resp.detail?.referee || resp.matchReferee;
            if (typeof refData === 'string') {
              refereeName = refData;
            } else if (refData && typeof refData === 'object' && ('name' in refData || 'fullName' in refData)) {
              const r = refData as { name?: string; fullName?: string };
              refereeName = r.name || r.fullName || '';
            }
            if (!refereeName && resp.matchInfo?.referee) {
              const miRef = resp.matchInfo.referee;
              refereeName = typeof miRef === 'string' ? miRef : (miRef.name || '');
            }

            // 2. Estrai data
            matchDateFromApi = resp.detail?.matchTimeUTCDate || resp.matchTime || resp.date || '';

            // 3. Estrai eventi (gol)
            const possibleEvents = [
              resp.events,
              resp.detail?.events,
              resp.matchEvents,
              resp.matchHistory,
              resp.eventlist,
              resp.incidents,
              resp.timeline,
              resp.all_events,
              resp.match_events
            ];
            
            const events = possibleEvents.find(e => Array.isArray(e)) as FreeApiEvent[] | undefined;
            
            if (events) {
              console.log(`DEBUG: Trovati ${events.length} eventi nel match`);
              apiGoals = events
                .filter(e => {
                  const type = (e.type || e.text || e.event_type || '').toLowerCase();
                  return type.includes('goal') || type.includes('scored');
                })
                .map(e => ({
                  minute: e.time || e.minute || e.elapsed || e.event_minute || 0,
                  extraTime: e.overtime || e.extraTime || e.event_extra_minute || null,
                  type: e.text || e.type || e.event_type || 'Goal',
                  team: { 
                    id: (e.isHome || e.side === 'home' || e.team_id === baseMatchDetails.homeTeam.id) ? baseMatchDetails.homeTeam.id : baseMatchDetails.awayTeam.id, 
                    name: (e.isHome || e.side === 'home' || e.team_id === baseMatchDetails.homeTeam.id) ? baseMatchDetails.homeTeam.name : baseMatchDetails.awayTeam.name 
                  },
                  player: { id: 0, name: e.playerName || e.player?.name || e.event_player || 'Giocatore' }
                }));
            }

            // 4. Estrai Formazioni (Lineups)
            const lineups = resp.lineups || resp.teams || resp.matchLineups;
            if (lineups) {
              let hL: FreeApiLineup = {};
              let aL: FreeApiLineup = {};

              if (!Array.isArray(lineups)) {
                hL = lineups.home || {};
                aL = lineups.away || {};
              } else if (lineups.length >= 2) {
                hL = lineups[0] || {};
                aL = lineups[1] || {};
              }
              
              homeFormation = hL.formation || hL.system || '';
              awayFormation = aL.formation || aL.system || '';

              const extractPlayers = (list: FreeApiPlayer[] | undefined) => {
                if (!list || !Array.isArray(list)) return [];
                return list.map(p => ({
                  id: p.id || p.playerId || 0,
                  name: p.name || p.playerName || p.player?.name || 'Giocatore',
                  shirtNumber: p.number || p.shirtNumber || p.jerseyNumber || 0,
                  position: p.position || p.pos || ''
                }));
              };

              homeLineup = extractPlayers(hL.startXI || hL.startingLineup || hL.players);
              awayLineup = extractPlayers(aL.startXI || aL.startingLineup || aL.players);
              homeBench = extractPlayers(hL.substitutes || hL.bench);
              awayBench = extractPlayers(aL.substitutes || aL.bench);
            }
          }

          const findStat = (keys: string[]) => {
            if (!statsData || !statsData.response) return { home: 0, away: 0 };
            const resp = statsData.response;
            const statsSource = resp.stats || resp.statistics || resp.match_stats || resp.data;

            if (!statsSource || !Array.isArray(statsSource)) return { home: 0, away: 0 };
            
            const lowerKeys = keys.map(k => k.toLowerCase());
            
            const extractValuesLocal = (stat: FreeApiStatItem) => {
              const parseVal = (val: string | number | null | undefined) => {
                if (val === null || val === undefined) return 0;
                if (typeof val === 'number') return val;
                const match = String(val).match(/(\d+)/);
                return match ? Number(match[1]) : 0;
              };

              if (stat.home !== undefined || stat.away !== undefined) {
                return { home: parseVal(stat.home), away: parseVal(stat.away) };
              }

              const vals = stat.stats || stat.values || stat.value || [];
              if (Array.isArray(vals) && vals.length >= 2) {
                return { home: parseVal(vals[0]), away: parseVal(vals[1]) };
              }
              return { home: 0, away: 0 };
            };

            for (const item of statsSource) {
              if ('stats' in item || 'statistics' in item) {
                const group = item as FreeApiStatsGroup;
                const items = group.stats || group.statistics;
                if (Array.isArray(items)) {
                  const found = items.find(s => {
                    const key = s.key || s.title || s.type || '';
                    return lowerKeys.includes(key.toLowerCase());
                  });
                  if (found) return extractValuesLocal(found);
                }
              } else {
                const s = item as FreeApiStatItem;
                const key = s.key || s.title || s.type || '';
                if (lowerKeys.includes(key.toLowerCase())) {
                   return extractValuesLocal(s);
                }
              }
            }
            return { home: 0, away: 0 };
          };

          setMatchDetails(prev => {
            if (!prev) return null;
            
            return {
              ...prev,
              utcDate: matchDateFromApi || prev.utcDate,
              referees: refereeName ? [{ name: refereeName }] : (prev.referees || []),
              goals: apiGoals.length > 0 ? apiGoals : (prev.goals || []),
              homeTeam: {
                ...prev.homeTeam,
                formation: homeFormation || prev.homeTeam.formation,
                lineup: homeLineup.length > 0 ? homeLineup : (prev.homeTeam.lineup || []),
                bench: homeBench.length > 0 ? homeBench : (prev.homeTeam.bench || [])
              },
              awayTeam: {
                ...prev.awayTeam,
                formation: awayFormation || prev.awayTeam.formation,
                lineup: awayLineup.length > 0 ? awayLineup : (prev.awayTeam.lineup || []),
                bench: awayBench.length > 0 ? awayBench : (prev.awayTeam.bench || [])
              },
              score: {
                fullTime: { 
                  home: scoreHome !== undefined ? scoreHome : (prev.score?.fullTime?.home ?? 0), 
                  away: scoreAway !== undefined ? scoreAway : (prev.score?.fullTime?.away ?? 0)
                },
                halfTime: prev.score?.halfTime || { home: 0, away: 0 }
              },
              statistics: {
                'Possesso Palla': findStat(['BallPossesion', 'Possession', 'Ball possession']),
                'Tiri Totali': findStat(['ShotsTotal', 'Total shots', 'Shots']),
                'Tiri in Porta': findStat(['ShotsOnGoal', 'Shots on target', 'On Target']),
                'Falli Commessi': findStat(['fouls', 'Fouls committed']),
                'Calci d\'angolo': findStat(['corners', 'Corners']),
                'Cartellini Gialli': findStat(['yellow_cards', 'Yellow cards']),
                'Cartellini Rossi': findStat(['red_cards', 'Red cards'])
              }
            };
          });
          setLoadingDetails(false);
        }
      } else if (typeof responseData === 'object' && responseData !== null && 'response' in responseData && Array.isArray((responseData as AfResponse).response)) {
        const af = (responseData as AfResponse).response[0];
        if (af) {
          const parseAfStat = (val: string | number | null | undefined): number => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'number') return val;
            return parseInt(String(val).replace('%', '')) || 0;
          };

          const homeLineup = af.lineups?.find(l => l.team.id === af.teams.home.id);
          const awayLineup = af.lineups?.find(l => l.team.id === af.teams.away.id);

          const homeStats = af.statistics?.find(s => s.team.id === af.teams.home.id)?.statistics;
          const awayStats = af.statistics?.find(s => s.team.id === af.teams.away.id)?.statistics;

          const findAfStat = (type: string) => ({
            home: parseAfStat(homeStats?.find(st => st.type === type)?.value),
            away: parseAfStat(awayStats?.find(st => st.type === type)?.value)
          });

          setMatchDetails(prev => prev ? {
            ...prev,
            homeTeam: {
              ...prev.homeTeam,
              formation: homeLineup?.formation,
              lineup: homeLineup?.startXI.map(p => ({ id: p.player.id, name: p.player.name, shirtNumber: p.player.number, position: p.player.pos })) || [],
              bench: homeLineup?.substitutes.map(p => ({ id: p.player.id, name: p.player.name, shirtNumber: p.player.number, position: 'R' })) || []
            },
            awayTeam: {
              ...prev.awayTeam,
              formation: awayLineup?.formation,
              lineup: awayLineup?.startXI.map(p => ({ id: p.player.id, name: p.player.name, shirtNumber: p.player.number, position: p.player.pos })) || [],
              bench: awayLineup?.substitutes.map(p => ({ id: p.player.id, name: p.player.name, shirtNumber: p.player.number, position: 'R' })) || []
            },
            goals: af.events?.filter(e => e.type === 'Goal').map(e => ({ 
              minute: e.time.elapsed, 
              extraTime: e.time.extra, 
              type: e.detail, 
              team: { id: e.team.id, name: e.team.name }, 
              player: { id: e.player.id, name: e.player.name } 
            })) || [],
            statistics: {
              'Possesso Palla': findAfStat('Ball Possession'),
              'Tiri Totali': findAfStat('Total Shots'),
              'Tiri in Porta': findAfStat('Shots on Goal'),
              'Falli Commessi': findAfStat('Fouls'),
              'Calci d\'angolo': findAfStat('Corner Kicks'),
              'Cartellini Gialli': findAfStat('Yellow Cards'),
              'Cartellini Rossi': findAfStat('Red Cards')
            }
          } : null);
        }
      }
    } catch (error) {
      console.error('ERRORE CRITICO nel caricamento dettagli:', error);
      if (axios.isAxiosError(error)) {
        console.error('Dettagli errore Axios:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      console.warn('Dettagli extra non disponibili (limite API o match futuro)', error);
    } finally {
      setLoadingDetails(false);
    }
  }, [matches, teams]);

  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await axios.get<boolean>('http://localhost:8080/api/teams/sync-status');
      setIsSynced(response.data);
    } catch (error) {
      console.error('Errore nel controllo sincronizzazione:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTeams(), fetchMatches(filterSeason), fetchScorers(), checkSyncStatus()]);
    setLoading(false);
  }, [fetchTeams, fetchMatches, fetchScorers, checkSyncStatus, filterSeason]);

  const updateStandings = async () => {
    setUpdating(true);
    try {
      await axios.get<void>('http://localhost:8080/api/teams/update');
      await fetchTeams();
      await checkSyncStatus();
    } catch (error) {
      console.error('Errore durante l\'aggiornamento:', error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Ricarica solo le partite quando cambia la stagione
    if (!loading) {
      fetchMatches(filterSeason);
    }
  }, [filterSeason, fetchMatches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-x-hidden selection:bg-sky-500/30">
      {selectedMatchId ? (
        <div className="container mx-auto px-4 py-8">
          {loadingDetails ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <RefreshCw className="h-12 w-12 text-sky-500 animate-spin" />
              <p className="text-slate-400 font-medium animate-pulse">Caricamento dettagli match...</p>
            </div>
          ) : matchDetails ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => {
                    setSelectedMatchId(null);
                    setMatchDetails(null);
                  }}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 group flex items-center gap-2"
                >
                  <ChevronLeft className="h-6 w-6 text-sky-400 group-hover:-translate-x-1 transition-transform" />
                  <span className="font-bold text-sky-400 pr-2">Torna alle Partite</span>
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white">Dettagli Match</h2>
                  <p className="text-slate-400 text-sm">Giornata {matchDetails.matchday} • {new Date(matchDetails.utcDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
                    <div className="p-8 md:p-12 bg-gradient-to-br from-slate-800 to-slate-900">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 flex flex-col items-center text-center gap-4">
                          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full p-6 border border-white/10 shadow-inner">
                            <img src={matchDetails.homeTeam.crest} alt="" className="w-full h-full object-contain" />
                          </div>
                          <h3 className="text-xl md:text-2xl font-black text-white">{matchDetails.homeTeam.name}</h3>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-2">
                            {matchDetails.score.fullTime.home} - {matchDetails.score.fullTime.away}
                          </div>
                          <span className="px-4 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold border border-sky-500/30 uppercase tracking-widest">
                            {matchDetails.status === 'FINISHED' ? 'Terminata' : matchDetails.status}
                          </span>
                        </div>

                        <div className="flex-1 flex flex-col items-center text-center gap-4">
                          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full p-6 border border-white/10 shadow-inner">
                            <img src={matchDetails.awayTeam.crest} alt="" className="w-full h-full object-contain" />
                          </div>
                          <h3 className="text-xl md:text-2xl font-black text-white">{matchDetails.awayTeam.name}</h3>
                        </div>
                      </div>

                      {/* Goal and Events Section */}
                      <div className="mt-8 px-8 pb-4 border-t border-white/5 pt-6">
                        {matchDetails.goals && matchDetails.goals.length > 0 ? (
                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                              {matchDetails.goals
                                .filter(g => g.team.id === matchDetails.homeTeam.id || g.team.name === matchDetails.homeTeam.name)
                                .map((goal, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                                    <Target className="h-3 w-3 text-sky-400" />
                                    <span>{goal.player.name} {goal.minute}'{goal.extraTime ? `+${goal.extraTime}` : ''} {goal.type === 'Own Goal' ? '(AU)' : ''}</span>
                                  </div>
                                ))}
                            </div>
                            <div className="space-y-2 text-right">
                              {matchDetails.goals
                                .filter(g => g.team.id === matchDetails.awayTeam.id || g.team.name === matchDetails.awayTeam.name)
                                .map((goal, idx) => (
                                  <div key={idx} className="flex items-center gap-2 justify-end text-sm text-slate-300">
                                    <span>{goal.player.name} {goal.minute}'{goal.extraTime ? `+${goal.extraTime}` : ''} {goal.type === 'Own Goal' ? '(AU)' : ''}</span>
                                    <Target className="h-3 w-3 text-rose-400" />
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                            <Target className="h-5 w-5 mb-2 opacity-20" />
                            <p className="text-[10px] uppercase tracking-widest font-bold">Dettagli marcatori non disponibili</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 border-t border-slate-700 bg-slate-900/50">
                      <div className="p-6 text-center border-r border-slate-700">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Stadio</p>
                        <p className="text-white font-medium truncate px-2">
                          {matchDetails.venue || 
                           teams.find(t => 
                             matchDetails.homeTeam.name.toLowerCase().includes(t.name.toLowerCase()) ||
                             t.name.toLowerCase().includes(matchDetails.homeTeam.name.toLowerCase())
                           )?.stadiumName || 
                           'Stadio non specificato'}
                        </p>
                      </div>
                      <div className="p-6 text-center border-r border-slate-700">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Arbitro</p>
                        <p className="text-white font-medium">{matchDetails.referees?.[0]?.name || 'N/A'}</p>
                      </div>
                      <div className="p-6 text-center">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1">Tabellino Live</p>
                        <a 
                          href={`https://www.google.com/search?q=${matchDetails.homeTeam.name}+vs+${matchDetails.awayTeam.name}+tabellino+live`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                        >
                          <Info className="h-4 w-4" />
                          Google Live
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-xl">
                    <h4 className="text-lg font-bold flex items-center gap-3 mb-8">
                      <Users className="h-5 w-5 text-sky-400" />
                      Formazioni e Titolari {matchDetails.homeTeam.formation && `(${matchDetails.homeTeam.formation} vs ${matchDetails.awayTeam.formation})`}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div>
                        <p className="text-sky-400 font-bold mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                          {matchDetails.homeTeam.name}
                        </p>
                        <div className="space-y-3">
                          {matchDetails.homeTeam.lineup && matchDetails.homeTeam.lineup.length > 0 ? (
                            matchDetails.homeTeam.lineup.map((player: Player) => (
                              <div key={player.id} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                                <div className="flex flex-col">
                                  <span className="text-slate-300 font-medium">{player.name}</span>
                                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">{player.position}</span>
                                </div>
                                <span className="text-slate-500 text-xs font-mono">{player.shirtNumber}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 italic text-sm p-4 bg-slate-900/30 rounded-xl border border-slate-700/50">
                              Formazione non ancora disponibile.
                            </div>
                          )}

                          {matchDetails.homeTeam.bench && matchDetails.homeTeam.bench.length > 0 && (
                            <div className="mt-6">
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Panchina</p>
                              <div className="grid grid-cols-1 gap-1">
                                {matchDetails.homeTeam.bench.map((player: Player) => (
                                  <div key={player.id} className="text-xs text-slate-400 flex justify-between py-1 border-b border-slate-700/30">
                                    <span>{player.name}</span>
                                    <span className="font-mono text-slate-500">{player.shirtNumber}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                          {/* Substitutions Section */}
                          <div className="mt-6 border-t border-slate-700/50 pt-4">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                              <History className="h-3 w-3" /> Sostituzioni
                            </p>
                            {/* Cerchiamo le sostituzioni sia in homeTeam che al livello principale (API standard) */}
                            {((matchDetails.homeTeam.substitutions?.length || 0) > 0 || 
                              (matchDetails.substitutions?.filter(s => s.team.id === matchDetails.homeTeam.id || s.team.name === matchDetails.homeTeam.name).length || 0) > 0) ? (
                              <div className="space-y-2">
                                {[
                                  ...(matchDetails.homeTeam.substitutions || []),
                                  ...(matchDetails.substitutions?.filter(s => s.team.id === matchDetails.homeTeam.id || s.team.name === matchDetails.homeTeam.name) || [])
                                ].map((sub, idx) => (
                                  <div key={idx} className="text-xs flex items-center gap-2 text-slate-400">
                                    <span className="font-bold text-sky-400 w-6">{sub.minute}'</span>
                                    <div className="flex flex-col">
                                      <span className="text-emerald-400">↑ {sub.playerIn.name}</span>
                                      <span className="text-rose-400">↓ {sub.playerOut.name}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Dati non pervenuti</p>
                                <a 
                                  href={`https://www.sofascore.com/search?q=${matchDetails.homeTeam.name}+${matchDetails.awayTeam.name}`}
                                  target="_blank"
                                  className="text-[10px] text-sky-400 hover:underline"
                                >
                                  Controlla su SofaScore
                                </a>
                              </div>
                            )}
                          </div>
                      </div>
                      <div>
                        <p className="text-rose-400 font-bold mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          {matchDetails.awayTeam.name}
                        </p>
                        <div className="space-y-3">
                          {matchDetails.awayTeam.lineup && matchDetails.awayTeam.lineup.length > 0 ? (
                            matchDetails.awayTeam.lineup.map((player: Player) => (
                              <div key={player.id} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                                <div className="flex flex-col">
                                  <span className="text-slate-300 font-medium">{player.name}</span>
                                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">{player.position}</span>
                                </div>
                                <span className="text-slate-500 text-xs font-mono">{player.shirtNumber}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 italic text-sm p-4 bg-slate-900/30 rounded-xl border border-slate-700/50">
                              Formazione non ancora disponibile.
                            </div>
                          )}

                          {matchDetails.awayTeam.bench && matchDetails.awayTeam.bench.length > 0 && (
                            <div className="mt-6">
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">Panchina</p>
                              <div className="grid grid-cols-1 gap-1">
                                {matchDetails.awayTeam.bench.map((player: Player) => (
                                  <div key={player.id} className="text-xs text-slate-400 flex justify-between py-1 border-b border-slate-700/30">
                                    <span>{player.name}</span>
                                    <span className="font-mono text-slate-500">{player.shirtNumber}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                          {/* Substitutions Section */}
                          <div className="mt-6 border-t border-slate-700/50 pt-4">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                              <History className="h-3 w-3" /> Sostituzioni
                            </p>
                            {/* Cerchiamo le sostituzioni sia in awayTeam che al livello principale (API standard) */}
                            {((matchDetails.awayTeam.substitutions?.length || 0) > 0 || 
                              (matchDetails.substitutions?.filter(s => s.team.id === matchDetails.awayTeam.id || s.team.name === matchDetails.awayTeam.name).length || 0) > 0) ? (
                              <div className="space-y-2">
                                {[
                                  ...(matchDetails.awayTeam.substitutions || []),
                                  ...(matchDetails.substitutions?.filter(s => s.team.id === matchDetails.awayTeam.id || s.team.name === matchDetails.awayTeam.name) || [])
                                ].map((sub, idx) => (
                                  <div key={idx} className="text-xs flex items-center gap-2 text-slate-400">
                                    <span className="font-bold text-rose-400 w-6">{sub.minute}'</span>
                                    <div className="flex flex-col">
                                      <span className="text-emerald-400">↑ {sub.playerIn.name}</span>
                                      <span className="text-rose-400">↓ {sub.playerOut.name}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-600 italic">Dati non disponibili</p>
                            )}
                          </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-xl">
                    <h4 className="text-lg font-bold flex items-center gap-3 mb-8">
                      <Info className="h-5 w-5 text-sky-400" />
                      Statistiche Match
                    </h4>
                    <div className="space-y-6">
                      {matchDetails.statistics && Object.keys(matchDetails.statistics).length > 0 ? (
                        Object.entries(matchDetails.statistics).map(([key, value]) => (
                          <div key={key}>
                            <div className="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2">
                              <span>{key.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-white font-bold w-8">{value.home}</span>
                              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden flex">
                                <div className="h-full bg-sky-500" style={{ width: `${(value.home / (value.home + value.away)) * 100}%` }}></div>
                                <div className="h-full bg-rose-500" style={{ width: `${(value.away / (value.home + value.away)) * 100}%` }}></div>
                              </div>
                              <span className="text-white font-bold w-8 text-right">{value.away}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                            <List className="h-8 w-8 text-slate-600" />
                          </div>
                          <p className="text-slate-500 text-sm">Statistiche avanzate (possesso, tiri) non incluse nel piano base dell'API.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-sky-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-sky-900/20">
                    <h4 className="text-xl font-black mb-2">Highlights</h4>
                    <p className="text-sky-100 text-sm mb-6">Guarda le azioni migliori sul canale ufficiale.</p>
                    <a 
                      href={`https://www.youtube.com/results?search_query=highlights+${matchDetails.homeTeam.name}+${matchDetails.awayTeam.name}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-white text-blue-700 rounded-2xl font-black hover:bg-sky-50 transition-all shadow-lg"
                    >
                      <PlayCircle className="h-6 w-6" />
                      GUARDA ORA
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <p className="text-slate-400">Impossibile caricare i dettagli.</p>
              <button onClick={() => setSelectedMatchId(null)} className="text-sky-400 hover:underline">Torna indietro</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Sidebar Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

      {/* Sidebar Menu */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-slate-950 z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-slate-800 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <img 
                src="https://i.postimg.cc/75n2yGJH/immagine-2026-02-02-105350297-removebg-preview.png" 
                alt="Logo" 
                className="h-10 w-auto"
              />
              <span className="font-bold text-xl tracking-tight text-sky-400">Menu</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
              <X className="h-6 w-6 text-slate-400" />
            </button>
          </div>

          <nav className="space-y-2 flex-1">
            <button 
              onClick={() => { setActiveTab('classifica'); setIsSidebarOpen(false); setSelectedMatchId(null); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${activeTab === 'classifica' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Table className="h-5 w-5" />
              <span className="font-semibold">Classifica</span>
            </button>
            
            <button 
              onClick={() => { setActiveTab('partite'); setIsSidebarOpen(false); setSelectedMatchId(null); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${activeTab === 'partite' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">Partite</span>
            </button>

            <button 
              onClick={() => { setActiveTab('squadre'); setIsSidebarOpen(false); setSelectedMatchId(null); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${activeTab === 'squadre' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Users className="h-5 w-5" />
              <span className="font-semibold">Squadre</span>
            </button>

            <a href="#" className="flex items-center gap-4 px-4 py-4 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
              <History className="h-5 w-5" />
              <span className="font-semibold">Storia</span>
            </a>

            <a href="#" className="flex items-center gap-4 px-4 py-4 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
              <Ticket className="h-5 w-5" />
              <span className="font-semibold">Biglietti</span>
            </a>
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <button className="w-full flex items-center justify-center gap-3 bg-sky-900 hover:bg-sky-800 text-sky-100 py-4 rounded-xl font-bold transition-all border border-sky-700 shadow-lg">
              <Building2 className="h-5 w-5" />
              Cambia Campionato
            </button>
          </div>
        </div>
      </div>

      {/* Navbar Ingrandita */}
      <nav className="bg-sky-950 border-b border-sky-900 sticky top-0 z-50 shadow-xl py-4">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="group flex items-center gap-4 focus:outline-none"
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-sky-500/20 rounded-full blur-lg group-hover:bg-sky-500/40 transition-all opacity-0 group-hover:opacity-100"></div>
                <img 
                  src="https://i.postimg.cc/75n2yGJH/immagine-2026-02-02-105350297-removebg-preview.png" 
                  alt="Football Hub Logo" 
                  className="h-16 w-auto relative brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform group-hover:scale-110"
                />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold text-sky-400 tracking-[0.2em] uppercase">Football Hub</span>
                <div className="flex items-center gap-2 text-slate-300">
                  <Menu className="h-4 w-4" />
                  <span className="text-sm font-medium">Menu Navigazione</span>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 text-sky-200/50 text-xs font-mono">
                <span className={`w-2 h-2 rounded-full animate-pulse ${isSynced ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></span>
                {isSynced ? 'SERIE A LIVE' : 'SYNC RICHIESTA'}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/960px-Serie_A_logo_2022.svg.png" 
              alt="Serie A Logo" 
              className="h-32 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform duration-300"
            />
          </div>
          <button
            onClick={updateStandings}
            disabled={updating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <RefreshCw className={`h-6 w-6 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Aggiornamento...' : 'Aggiorna Classifica'}
          </button>
        </header>

        <div className="w-full">
          <div className="space-y-8">
            {activeTab === 'classifica' ? (
              <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700">
                <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {showScorers ? (
                      <Target className="h-5 w-5 text-rose-500" />
                    ) : (
                      <Table className="h-5 w-5 text-sky-400" />
                    )}
                    {showScorers ? 'Classifica Marcatori' : 'Classifica Attuale'}
                  </h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowScorers(!showScorers)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border ${
                        showScorers 
                          ? 'bg-sky-500/10 border-sky-500/50 text-sky-400' 
                          : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                      }`}
                    >
                      {showScorers ? <Table className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                      {showScorers ? 'Vedi Classifica Club' : 'Vedi Capocannonieri'}
                    </button>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:block">Serie A Enilive 2024/25</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {!showScorers ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-700/30">
                          <th className="px-6 py-4 font-bold text-slate-300 uppercase text-xs tracking-widest">Pos</th>
                          <th className="px-6 py-4 font-bold text-slate-300 uppercase text-xs tracking-widest">Squadra</th>
                          <th className="px-6 py-4 font-bold text-slate-300 uppercase text-xs tracking-widest text-center">Punti</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {teams.map((team, index) => (
                          <tr key={team.id} className="hover:bg-sky-500/5 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-500 group-hover:text-sky-400 transition-colors">{index + 1}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                {team.logoUrl && (
                                  <div className="w-14 h-14 bg-white/5 rounded-xl p-2 border border-white/5 group-hover:border-sky-500/30 transition-all shadow-lg">
                                    <img 
                                      src={team.logoUrl} 
                                      alt={team.name} 
                                      className="w-full h-full object-contain" 
                                    />
                                  </div>
                                )}
                                <span className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors">{team.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-4 py-2 bg-sky-500/10 text-sky-400 text-lg font-black rounded-xl border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-all">
                                {team.points}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-700/30">
                          <th className="px-6 py-4 font-bold text-slate-300 uppercase text-xs tracking-widest">Pos</th>
                          <th className="px-6 py-4 font-bold text-slate-300 uppercase text-xs tracking-widest">Giocatore</th>
                          <th className="px-6 py-4 font-bold text-slate-300 uppercase text-xs tracking-widest">Squadra</th>
                          <th className="px-6 py-4 font-bold text-slate-300 uppercase text-xs tracking-widest text-center">Gol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {scorers.map((scorer, index) => (
                          <tr key={scorer.player.id} className="hover:bg-rose-500/5 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-500 group-hover:text-rose-400 transition-colors">{index + 1}</td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors">{scorer.player.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={scorer.team.crest} alt="" className="h-8 w-8 object-contain" />
                                <span className="text-slate-400 text-sm group-hover:text-slate-200">{scorer.team.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-block px-4 py-2 bg-rose-500/10 text-rose-400 text-lg font-black rounded-xl border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                {scorer.goals}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : activeTab === 'partite' ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-sky-400" />
                    Calendario Partite
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filtro Stagione */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Stagione</label>
                      <select 
                        value={filterSeason}
                        onChange={(e) => setFilterSeason(parseInt(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2 outline-none focus:border-sky-500/50 transition-all cursor-pointer"
                      >
                        <option value={2024}>2024 / 2025</option>
                        <option value={2025}>2025 / 2026</option>
                        <option value={2023}>2023 / 2024</option>
                      </select>
                    </div>

                    {/* Filtro Stato */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Stato</label>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'FINISHED' | 'SCHEDULED' | 'TIMED' | 'IN_PLAY')}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2 outline-none focus:border-sky-500/50 transition-all cursor-pointer"
                      >
                        <option value="ALL">Tutte</option>
                        <option value="FINISHED">Finite</option>
                        <option value="SCHEDULED">In programma</option>
                        <option value="IN_PLAY">In corso</option>
                      </select>
                    </div>

                    {/* Ricerca Squadra */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Cerca Squadra</label>
                      <input 
                        type="text"
                        placeholder="Es: Inter, Milan..."
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2 outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches
                    .filter(match => {
                      const matchesTeam = filterTeam === '' || 
                        match.homeTeam.name.toLowerCase().includes(filterTeam.toLowerCase()) || 
                        match.awayTeam.name.toLowerCase().includes(filterTeam.toLowerCase());
                      const matchesStatus = filterStatus === 'ALL' || match.status === filterStatus;
                      return matchesTeam && matchesStatus;
                    })
                    .map((match) => {
                          const homeTeamData = teams.find(t => t.name.includes(match.homeTeam.shortName) || match.homeTeam.name.includes(t.name));
                          const stadiumBg = homeTeamData?.stadiumUrl;
                          return (
                            <div 
                              key={match.id} 
                              onClick={() => fetchMatchDetails(match.id)}
                              className="relative overflow-hidden rounded-2xl border border-slate-700 h-64 group transition-all hover:border-sky-500/50 cursor-pointer shadow-lg hover:shadow-sky-500/10"
                            >
                              <div className="absolute inset-0 z-0">
                                {stadiumBg ? (
                                  <>
                                    <img src={stadiumBg} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 object-center" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-slate-900/20"></div>
                                  </>
                                ) : (
                                  <div className="w-full h-full bg-slate-800"></div>
                                )}
                              </div>
                              <div className="relative z-10 h-full flex flex-col p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-3 py-1 rounded-full border border-sky-500/30 uppercase">GIORNATA {match.matchday}</span>
                                  <span className="text-slate-300 text-xs font-medium">{new Date(match.utcDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                </div>
                                <div className="flex-1 flex items-center justify-between gap-4">
                                  <div className="flex-1 flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-center border border-white/10 shadow-xl">
                                      <img src={match.homeTeam.crest} alt="" className="w-14 h-14 object-contain" />
                                    </div>
                                    <span className="font-bold text-center text-sm md:text-base leading-tight drop-shadow-lg">{match.homeTeam.name}</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="bg-white/5 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                                      <span className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                                        {match.status === 'FINISHED' ? `${match.score.fullTime.home} - ${match.score.fullTime.away}` : new Date(match.utcDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-1 flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-center border border-white/10 shadow-xl">
                                      <img src={match.awayTeam.crest} alt="" className="w-14 h-14 object-contain" />
                                    </div>
                                    <span className="font-bold text-center text-sm md:text-base leading-tight drop-shadow-lg">{match.awayTeam.name}</span>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-[10px] uppercase font-semibold tracking-wider">{homeTeamData?.stadiumName || 'Stadio Olimpico'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    <Users className="h-8 w-8 text-sky-400" />
                    Squadre Serie A
                  </h2>
                  <div className="text-slate-400 text-sm font-medium bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                    {teams.length} Squadre Totali
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
                    <div key={team.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:border-sky-500/50 hover:bg-slate-800/80 transition-all group relative overflow-hidden">
                      {/* Badge in background */}
                      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <img src={team.logoUrl} alt="" className="w-32 h-32 grayscale" />
                      </div>
                      
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-white/5 rounded-3xl p-4 mb-4 border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-2xl">
                          <img 
                            src={team.logoUrl} 
                            alt={team.name} 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-sky-400 transition-colors">{team.name}</h3>
                        <div className="space-y-2 w-full">
                          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                            <MapPin className="h-4 w-4 text-sky-500/50" />
                            {team.city}
                          </div>
                          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                            <Building2 className="h-4 w-4 text-sky-500/50" />
                            {team.stadiumName}
                          </div>
                        </div>
                        <button className="mt-6 w-full py-3 bg-slate-900/50 hover:bg-sky-500 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-sky-400">
                          Vedi Dettagli
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
}

export default App;
