import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Trophy, Plus, ArrowRight } from 'lucide-react';

export default function ActiveGame() {
  const { 
    players, 
    activeTeamId, 
    activePlayerIndexByTeam, 
    scores, 
    myPlayerId, 
    addScore, 
    nextTurn 
  } = useStore();

  const [pointsInput, setPointsInput] = useState<number | ''>('');

  // Determine current active team and player
  const activeTeamPlayers = players.filter(p => p.team === activeTeamId);
  const activePlayerIndex = activeTeamId ? activePlayerIndexByTeam[activeTeamId] || 0 : 0;
  const activePlayer = activeTeamPlayers[activePlayerIndex];
  const teamLeader = activeTeamPlayers[0];

  // Permissions
  const isMyTurn = activePlayer?.id === myPlayerId;
  const isTeamLeader = teamLeader?.id === myPlayerId;
  const canScore = isMyTurn || isTeamLeader;

  // Group all teams for scoreboard
  const teams = Array.from(new Set(players.map(p => p.team).filter(Boolean))) as number[];
  teams.sort();

  useEffect(() => {
    if (activePlayer && activePlayer.id === myPlayerId) {
      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      // Play audio cheer
      if (activePlayer.audioUrl) {
        const audio = new Audio(activePlayer.audioUrl);
        audio.play().catch(e => console.warn('Audio play failed', e));
      }
    }
  }, [activePlayer?.id, myPlayerId]);

  const handleAddScore = () => {
    if (activeTeamId === null || pointsInput === '' || typeof pointsInput !== 'number') return;
    addScore(activeTeamId, pointsInput);
    setPointsInput('');
  };

  const handleNextTurn = () => {
    nextTurn();
  };

  if (!activeTeamId || !activePlayer) {
    return <div className="p-4 text-center">Loading game state...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Scoreboard */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Scoreboard
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {teams.map(teamId => (
            <div 
              key={teamId} 
              className={`p-4 rounded-lg border ${activeTeamId === teamId ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="text-sm font-semibold text-slate-500 mb-1">Team {teamId}</div>
              <div className="text-3xl font-bold text-slate-800">{scores[teamId] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Turn */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-center">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Current Turn</h3>
        <div className="text-2xl font-bold text-slate-800 mb-1">Team {activeTeamId}</div>
        <div className="text-xl font-medium text-green-600 mb-4">{activePlayer.name}</div>
        
        {isMyTurn && (
          <div className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold mb-4 animate-pulse">
            It's your turn!
          </div>
        )}

        {/* Action Area */}
        {canScore ? (
          <div className="space-y-4 border-t border-slate-100 pt-6 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 text-left">
                Add Points for Team {activeTeamId}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Points"
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                />
                <button
                  onClick={handleAddScore}
                  disabled={pointsInput === ''}
                  className="px-6 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
            </div>

            <button
              onClick={handleNextTurn}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              Finish Turn
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm">
            Waiting for {activePlayer.name} (or Team Leader) to play and enter points.
          </div>
        )}
      </div>
    </div>
  );
}