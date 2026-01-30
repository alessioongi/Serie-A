import { useState, useEffect } from 'react'
import axios from 'axios'
import { Trophy, MapPin, Building2, RefreshCw } from 'lucide-react'

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

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'classifica' | 'partite'>('classifica');

  const fetchTeams = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/teams');
      const sortedTeams = response.data.sort((a: Team, b: Team) => b.points - a.points);
      setTeams(sortedTeams);
    } catch (error) {
      console.error('Errore nel caricamento dei team:', error);
    }
  };

  const fetchMatches = async () => {
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
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTeams(), fetchMatches()]);
    setLoading(false);
  };

  const updateStandings = async () => {
    setUpdating(true);
    try {
      await axios.get('http://localhost:8080/api/teams/update');
      await fetchTeams();
    } catch (error) {
      console.error('Errore durante l\'aggiornamento:', error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navbar */}
      <nav className="bg-sky-950 border-b border-sky-900 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span className="font-bold text-lg tracking-tight">Football Hub</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <button 
                  onClick={() => setActiveTab('classifica')}
                  className={`text-sm font-medium transition-colors border-b-2 pb-1 ${activeTab === 'classifica' ? 'text-sky-200 border-sky-400' : 'text-sky-400 border-transparent hover:text-white'}`}
                >
                  Classifica
                </button>
                <button 
                  onClick={() => setActiveTab('partite')}
                  className={`text-sm font-medium transition-colors border-b-2 pb-1 ${activeTab === 'partite' ? 'text-sky-200 border-sky-400' : 'text-sky-400 border-transparent hover:text-white'}`}
                >
                  Partite
                </button>
                <a href="#" className="text-sm font-medium text-sky-400 hover:text-white transition-colors">Storia</a>
                <a href="#" className="text-sm font-medium text-sky-400 hover:text-white transition-colors">Biglietti</a>
              </div>
            </div>
            <div className="flex items-center">
              <a href="#" className="flex items-center gap-2 bg-sky-900 hover:bg-sky-800 text-sky-100 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-sky-700">
                <Building2 className="h-4 w-4" />
                Cambia Campionato
              </a>
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

        <div className={`grid grid-cols-1 ${activeTab === 'classifica' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
          <div className={activeTab === 'classifica' ? 'lg:col-span-2 space-y-8' : 'space-y-6'}>
            {activeTab === 'classifica' ? (
              <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-semibold">Classifica Attuale</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th className="px-6 py-4 font-medium">Pos</th>
                      <th className="px-6 py-4 font-medium">Squadra</th>
                      <th className="px-6 py-4 font-medium text-center">Punti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {teams.map((team, index) => (
                      <tr key={team.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {team.logoUrl && (
                              <img 
                                src={team.logoUrl} 
                                alt={team.name} 
                                className="w-10 h-10 object-contain" 
                              />
                            )}
                            <span className="font-semibold">{team.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-400">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {matches.map((match) => {
                  const homeTeamData = teams.find(t => t.name.includes(match.homeTeam.shortName) || match.homeTeam.name.includes(t.name));
                  const stadiumBg = homeTeamData?.stadiumUrl;

                  return (
                    <div 
                      key={match.id} 
                      className="relative overflow-hidden rounded-2xl border border-slate-700 h-64 group transition-all hover:border-sky-500/50"
                    >
                      {/* Sfondo Stadio */}
                      <div className="absolute inset-0 z-0">
                        {stadiumBg ? (
                          <>
                            <img 
                              src={stadiumBg} 
                              alt="" 
                              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                                homeTeamData?.name.toLowerCase().includes('milan') || 
                                homeTeamData?.name.toLowerCase().includes('inter') ||
                                homeTeamData?.name.toLowerCase().includes('parma')
                                ? 'object-bottom' : 
                                homeTeamData?.name.toLowerCase().includes('genoa') || 
                                homeTeamData?.name.toLowerCase().includes('lecce')
                                ? 'object-top' : 'object-center'
                              }`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-slate-900/20"></div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-slate-800"></div>
                        )}
                      </div>

                      {/* Contenuto Match */}
                      <div className="relative z-10 h-full flex flex-col p-6">
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-3 py-1 rounded-full border border-sky-500/30">
                            GIORNATA {match.matchday}
                          </span>
                          <span className="text-slate-300 text-xs font-medium">
                            {new Date(match.utcDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="flex-1 flex items-center justify-between gap-4">
                          {/* Home Team */}
                          <div className="flex-1 flex flex-col items-center gap-3">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-center border border-white/10 shadow-xl">
                              <img src={match.homeTeam.crest} alt="" className="w-14 h-14 object-contain" />
                            </div>
                            <span className="font-bold text-center text-sm md:text-base leading-tight drop-shadow-lg">
                              {match.homeTeam.name}
                            </span>
                          </div>

                          {/* Score / VS */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="bg-white/5 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                              <span className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                                {match.status === 'FINISHED' 
                                  ? `${match.score.fullTime.home} - ${match.score.fullTime.away}` 
                                  : new Date(match.utcDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                                }
                              </span>
                            </div>
                            {match.status !== 'FINISHED' && (
                              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">LIVE PREVIEW</span>
                            )}
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 flex flex-col items-center gap-3">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-center border border-white/10 shadow-xl">
                              <img src={match.awayTeam.crest} alt="" className="w-14 h-14 object-contain" />
                            </div>
                            <span className="font-bold text-center text-sm md:text-base leading-tight drop-shadow-lg">
                              {match.awayTeam.name}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                          <MapPin className="h-3 w-3" />
                          <span className="text-[10px] uppercase font-semibold tracking-wider">
                            {homeTeamData?.stadiumName || 'Stadio Olimpico'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Stadiums - Solo visibile in Tab Classifica */}
          {activeTab === 'classifica' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold px-2">Stadi e Città</h2>
              {teams.map((team) => (
                <div key={team.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{team.name}</h3>
                      <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                        <MapPin className="h-4 w-4" />
                        {team.city}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                        <Building2 className="h-4 w-4" />
                        {team.stadiumName}
                      </div>
                    </div>
                    {team.logoUrl && (
                      <img 
                        src={team.logoUrl} 
                        alt={team.name} 
                        className="w-14 h-14 object-contain" 
                      />
                    )}
                  </div>
                  {team.stadiumUrl && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
                      <img 
                        src={team.stadiumUrl} 
                        alt={`Stadio ${team.stadiumName}`} 
                        className={`w-full h-32 object-cover hover:scale-110 transition-transform duration-500 ${
                          team.name.toLowerCase().includes('milan') || 
                          team.name.toLowerCase().includes('inter') ||
                          team.name.toLowerCase().includes('parma')
                          ? 'object-bottom' : 
                          team.name.toLowerCase().includes('genoa') || 
                          team.name.toLowerCase().includes('lecce')
                          ? 'object-top' : 'object-center'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="bg-slate-900/50 py-1 px-2 text-[10px] text-slate-500 text-center italic">
                        {team.stadiumName}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
