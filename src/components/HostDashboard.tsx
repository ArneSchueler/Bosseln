import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useStore } from "../store/useStore";
import { Users, Shuffle, Link as LinkIcon, Play } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function HostDashboard() {
  const {
    players,
    teamCount,
    setTeamCount,
    distributeTeams,
    startGame,
    sessionId,
    sessionUuid,
    _setPlayersFromServer,
  } = useStore();

  // URL to join
  const joinUrl = `${window.location.origin}/join?session=${sessionId}`;

  useEffect(() => {
    if (!sessionUuid) return;

    // Fetch initial players just in case
    supabase
      .from("players")
      .select("*")
      .eq("session_id", sessionUuid)
      .then(({ data }) => {
        if (data) _setPlayersFromServer(data);
      });
  }, [sessionUuid, _setPlayersFromServer]);

  const hasTeams = players.some((p) => p.team);

  // Group players by team for display
  const teams = players.reduce(
    (acc, player) => {
      if (player.team) {
        if (!acc[player.team]) acc[player.team] = [];
        acc[player.team].push(player);
      }
      return acc;
    },
    {} as Record<number, typeof players>,
  );

  const playPlayerAudio = (url?: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        Host Dashboard
      </h2>

      <div className="flex flex-col items-center mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
          Join via QR
        </h3>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-3">
          <QRCodeSVG value={joinUrl} size={150} />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
          <LinkIcon className="w-4 h-4" />
          <span className="font-mono">{sessionId}</span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-semibold text-lg mb-3 border-b pb-2 flex justify-between items-center">
          <span>Joined Players</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {players.length}
          </span>
        </h3>

        {players.length === 0 ? (
          <p className="text-slate-500 text-center py-4 italic">
            Waiting for players to join...
          </p>
        ) : !hasTeams ? (
          <ul className="space-y-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <span className="font-medium">{player.name}</span>
                {player.audioUrl && (
                  <button
                    onClick={() => playPlayerAudio(player.audioUrl)}
                    className="text-slate-400 hover:text-green-600 transition-colors"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            {Object.entries(teams).map(([teamId, teamPlayers]) => (
              <div
                key={teamId}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700">
                  Team {teamId}
                </div>
                <ul className="divide-y divide-slate-100">
                  {teamPlayers.map((player) => (
                    <li
                      key={player.id}
                      className="flex justify-between items-center p-3 bg-white"
                    >
                      <span>{player.name}</span>
                      {player.audioUrl && (
                        <button
                          onClick={() => playPlayerAudio(player.audioUrl)}
                          className="text-slate-400 hover:text-green-600 transition-colors"
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Shuffle className="w-4 h-4" />
          Team Distribution
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="teamCount"
              className="block text-sm font-medium text-blue-800 mb-1"
            >
              Number of Teams
            </label>
            <input
              id="teamCount"
              type="number"
              min="2"
              max="10"
              value={teamCount}
              onChange={(e) => setTeamCount(parseInt(e.target.value) || 2)}
              className="w-full px-3 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={distributeTeams}
            disabled={players.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Distribute
          </button>
        </div>
      </div>

      {hasTeams && (
        <div className="mt-6">
          <button
            onClick={startGame}
            className="w-full flex justify-center items-center py-4 bg-green-600 text-white text-lg font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors"
          >
            Start Game!
          </button>
        </div>
      )}
    </div>
  );
}
