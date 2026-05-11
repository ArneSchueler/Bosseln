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
      </div>
    </div>
  );
}
