import { useEffect, useState } from "react";
import PlayerRegistration from "./components/PlayerRegistration";
import HostDashboard from "./components/HostDashboard";
import ActiveGame from "./components/ActiveGame";
import StartPage from "./components/StartPage";
import WaitingRoom from "./components/WaitingRoom";
import { useStore } from "./store/useStore";
import { supabase } from "./lib/supabase";

function App() {
  const isGameStarted = useStore((state) => state.isGameStarted);
  const initSession = useStore((state) => state.initSession);
  const sessionId = useStore((state) => state.sessionId);
  const sessionUuid = useStore((state) => state.sessionUuid);
  const myPlayerId = useStore((state) => state.myPlayerId);
  const _setPlayersFromServer = useStore(
    (state) => state._setPlayersFromServer,
  );
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    const hostParam = params.get("host") === "true";

    if (hostParam) {
      setIsHost(true);
    }

    if (session) {
      console.log(
        `[App] Initializing session from URL: ${session}, isHost: ${hostParam}`,
      );
      initSession(session, hostParam);
    }
  }, [initSession]);

  // Global Realtime Subscriptions for Game State and Players
  useEffect(() => {
    if (!sessionUuid) return;

    // 1. Fetch initial players globally to ensure the list is accurate
    supabase
      .from("players")
      .select("*")
      .eq("session_id", sessionUuid)
      .then(({ data }) => {
        if (data && _setPlayersFromServer) _setPlayersFromServer(data);
      });

    // 2. Fetch initial game state
    supabase
      .from("game_state")
      .select("*")
      .eq("session_id", sessionUuid)
      .single()
      .then(({ data }) => {
        if (data) {
          useStore.setState({
            isGameStarted: data.is_game_started,
            teamCount: data.team_count,
            activeTeamId: data.active_team_id,
            activePlayerIndexByTeam: data.active_player_index_by_team,
            scores: data.scores,
          });
        }
      });

    const channel = supabase
      .channel(`sync-app-${sessionUuid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: `session_id=eq.${sessionUuid}`,
        },
        (payload) => {
          if (payload.new) {
            console.log("Realtime game_state update:", payload.new);
            useStore.setState({
              isGameStarted: (payload.new as any)?.is_game_started,
              teamCount: (payload.new as any)?.team_count,
              activeTeamId: (payload.new as any)?.active_team_id,
              activePlayerIndexByTeam: (payload.new as any)
                ?.active_player_index_by_team,
              scores: (payload.new as any)?.scores,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionUuid}`,
        },
        async () => {
          if (_setPlayersFromServer) {
            const { data } = await supabase
              .from("players")
              .select("*")
              .eq("session_id", sessionUuid);
            if (data) _setPlayersFromServer(data);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUuid, _setPlayersFromServer]);

  const handleStartSession = () => {
    const newSession = crypto.randomUUID().slice(0, 8);
    const newUrl = `${window.location.origin}/?session=${newSession}&host=true`;
    window.history.pushState({ path: newUrl }, "", newUrl);
    setIsHost(true);
    console.log(`[App] Starting new session: ${newSession}`);
    initSession(newSession, true);
  };

  const handleJoinSession = (id: string) => {
    const newUrl = `${window.location.origin}/join?session=${id}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
    console.log(`[App] Joining session: ${id}`);
    initSession(id, false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-green-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Bossel-Vibe</h1>
      </header>

      <main className="container mx-auto max-w-md p-4 space-y-8">
        {!sessionId ? (
          <StartPage
            onStartSession={handleStartSession}
            onJoinSession={handleJoinSession}
          />
        ) : isGameStarted ? (
          <ActiveGame />
        ) : (
          <>
            {!myPlayerId && (
              <section>
                <PlayerRegistration />
              </section>
            )}

            {myPlayerId && !isHost && (
              <section>
                <WaitingRoom />
              </section>
            )}

            {isHost && (
              <section
                className={!myPlayerId ? "pt-8 border-t border-slate-200" : ""}
              >
                <HostDashboard />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
