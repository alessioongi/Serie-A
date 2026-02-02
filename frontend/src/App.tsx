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
  score: { fullTime: { home: number; away: number } };
}

interface Player {
  id: number;
  name: string;
  shirtNumber: number;
  position?: string;
}

interface Goal {
  minute: number;
  extraTime?: number;
  type: string;
  team: { id: number; name: string };
  scorer: { id: number; name: string };
  assist?: { id: number; name: string };
}

interface Substitution {
  minute: number;
  team: { id: number; name: string };
  playerOut: { id: number; name: string };
  playerIn: { id: number; name: string };
}

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

  const fetchTeams = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/teams');
      const sortedTeams = response.data.sort((a: Team, b: Team) => b.points - a.points);
      setTeams(sortedTeams);
    } catch (error) {
      console.error('Errore nel caricamento dei team:', error);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/teams/matches');
      // Ordiniamo le partite per data
      const sortedMatches = response.data.matches.sort((a: Match, b: Match) => 
        new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      );
      setMatches(sortedMatches);
    } catch (error) {
      console.error('Errore nel caricamento delle partite:', error);
    }
  }, []);

  const fetchScorers = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/teams/scorers');
      setScorers(response.data.scorers);
    } catch (error) {
      console.error('Errore nel caricamento dei capocannonieri:', error);
    }
  }, []);

  const fetchMatchDetails = useCallback(async (id: number) => {
    setSelectedMatchId(id); // Impostiamo subito l'ID per mostrare il layout di caricamento dettagli
    setLoadingDetails(true);
    try {
      const response = await axios.get(`http://localhost:8080/api/teams/matches/${id}`);
      console.log('DATI RICEVUTI DALL\'API:', response.data);
      setMatchDetails(response.data);
    } catch (error) {
      console.error('Errore nel caricamento dei dettagli della partita:', error);
      setSelectedMatchId(null); // In caso di errore, torniamo alla lista
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/teams/sync-status');
      setIsSynced(response.data);
    } catch (error) {
      console.error('Errore nel controllo sincronizzazione:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTeams(), fetchMatches(), fetchScorers(), checkSyncStatus()]);
    setLoading(false);
  }, [fetchTeams, fetchMatches, fetchScorers, checkSyncStatus]);

  const updateStandings = async () => {
    setUpdating(true);
    try {
      await axios.get('http://localhost:8080/api/teams/update');
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
                                    <span>{goal.scorer.name} {goal.minute}'{goal.extraTime ? `+${goal.extraTime}` : ''} {goal.type === 'OWN_GOAL' ? '(AU)' : ''}</span>
                                  </div>
                                ))}
                            </div>
                            <div className="space-y-2 text-right">
                              {matchDetails.goals
                                .filter(g => g.team.id === matchDetails.awayTeam.id || g.team.name === matchDetails.awayTeam.name)
                                .map((goal, idx) => (
                                  <div key={idx} className="flex items-center gap-2 justify-end text-sm text-slate-300">
                                    <span>{goal.scorer.name} {goal.minute}'{goal.extraTime ? `+${goal.extraTime}` : ''} {goal.type === 'OWN_GOAL' ? '(AU)' : ''}</span>
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
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-sky-400" />
                    Calendario Partite
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.map((match) => {
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
