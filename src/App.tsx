import { useEffect, useState } from "react";
import PlayerRegistration from "./components/PlayerRegistration";
import HostDashboard from "./components/HostDashboard";
import ActiveGame from "./components/ActiveGame";
import StartPage from "./components/StartPage";
import { useStore } from "./store/useStore";

function App() {
  const isGameStarted = useStore((state) => state.isGameStarted);
  const initSession = useStore((state) => state.initSession);
  const sessionId = useStore((state) => state.sessionId);
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
            <section>
              <PlayerRegistration />
            </section>

            {isHost && (
              <section className="pt-8 border-t border-slate-200">
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
