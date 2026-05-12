import { useStore } from "../store/useStore";
import { Users, Loader2, Play } from "lucide-react";

export default function WaitingRoom() {
  const players = useStore((state) => state.players);

  const playPlayerAudio = (url?: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

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

  const unassignedPlayers = players.filter((p) => !p.team);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
        Waiting for Host
      </h2>
      <p className="text-slate-500 text-center mb-8">
        The game will begin shortly once the host distributes teams and starts
        the session.
      </p>

      <div className="w-full">
        <h3 className="font-semibold text-lg mb-3 border-b pb-2 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            Lobby
          </span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">
            {players.length} Joined
          </span>
        </h3>

        {!hasTeams ? (
          <ul className="space-y-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <span className="font-medium text-slate-700">{player.name}</span>
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
                <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700 flex justify-between">
                  <span>Team {teamId}</span>
                  <span className="text-sm text-slate-500">{teamPlayers.length} players</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {teamPlayers.map((player) => (
                    <li
                      key={player.id}
                      className="flex justify-between items-center p-3 bg-white"
                    >
                      <span className="text-slate-700">{player.name}</span>
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

            {unassignedPlayers.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700">
                  Unassigned Players
                </div>
                <ul className="divide-y divide-slate-100">
                  {unassignedPlayers.map((player) => (
                    <li
                      key={player.id}
                      className="flex justify-between items-center p-3 bg-white"
                    >
                      <span className="text-slate-700">{player.name}</span>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
