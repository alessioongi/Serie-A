import { useState, useEffect } from 'react'
import axios from 'axios'
import {  MapPin, Building2, RefreshCw } from 'lucide-react'

interface Team {
  id: number;
  name: string;
  city: string;
  stadiumName: string;
  stadiumUrl: string;
  logoUrl: string;
  points: number;
}

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchTeams = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/teams');
      // Ordiniamo per punti decrescenti
      const sortedTeams = response.data.sort((a: Team, b: Team) => b.points - a.points);
      setTeams(sortedTeams);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel caricamento dei team:', error);
      setLoading(false);
    }
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
    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Classifica Table */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-xl overflow-hidden">
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

        {/* Info Stadiums */}
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
                <a 
                  href={team.stadiumUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 block text-center text-xs text-blue-500 hover:underline"
                >
                  Visualizza Stadio
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
