import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; // Assuming supabase client is at this path

// A simple Player type for this component
interface Player {
  name: string;
}

const WaitingRoom = () => {
  // For demonstration, we'll use a hardcoded session ID.
  // In a real app, this would come from a URL parameter, context, or local storage.
  const sessionId = "bossel-vibe";

  const [players, setPlayers] = useState<Player[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);

  useEffect(() => {
    // Function to fetch players for the current session
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("name")
        .eq("session_id", sessionId);

      if (error) {
        console.error("Error fetching players:", error);
      } else if (data) {
        setPlayers(data);
      }
    };

    // Function to check the initial game state
    const checkGameState = async () => {
      const { data, error } = await supabase
        .from("game_state")
        .select("is_game_started")
        .eq("session_id", sessionId)
        .single();

      if (error) {
        console.error("Error fetching game state:", error.message);
      } else if (data && data.is_game_started) {
        setIsGameStarted(true);
      }
    };

    // Initial data fetch
    fetchPlayers();
    checkGameState();

    // Set up Supabase real-time subscriptions
    const playersSubscription = supabase
      .channel(`public:players:session_id=eq.${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchPlayers(), // Re-fetch players on any change
      )
      .subscribe();

    const gameStateSubscription = supabase
      .channel(`public:game_state:session_id=eq.${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.is_game_started) {
            setIsGameStarted(true);
          }
        },
      )
      .subscribe();

    // Cleanup function to remove subscriptions on component unmount
    return () => {
      supabase.removeChannel(playersSubscription);
      supabase.removeChannel(gameStateSubscription);
    };
  }, [sessionId]);

  if (isGameStarted) {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-green-600">
          The game has started!
        </h2>
        <p className="mt-2 text-slate-700">Good luck and have fun!</p>
      </div>
    );
  }

  return (
    <div className="text-center p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">
        Waiting for the Host to Start
      </h2>
      <div className="animate-pulse my-6">
        <svg
          className="mx-auto h-16 w-16 text-green-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-slate-600 mb-6">
        The host will begin the game shortly. In the meantime, here is who has
        joined so far.
      </p>

      <div className="text-left bg-slate-50 p-4 rounded-md">
        <h3 className="text-lg font-semibold mb-3 border-b border-slate-200 pb-2">
          Joined Players ({players.length})
        </h3>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {players.length > 0 ? (
            players.map((player, index) => (
              <li
                key={index}
                className="p-3 bg-white rounded-md shadow-sm flex items-center"
              >
                <span className="font-medium text-slate-700">
                  {player.name}
                </span>
              </li>
            ))
          ) : (
            <li className="p-3 text-slate-500">
              Waiting for players to join...
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default WaitingRoom;
