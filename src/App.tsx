import { useState } from "react";
import StartPage from "./components/StartPage";
import PlayerRegistration from "./components/PlayerRegistration";
import HostDashboard from "./components/HostDashboard";
import WaitingRoom from "./components/WaitingRoom";
import { useStore } from "./store/useStore";

function App() {
  const [view, setView] = useState<"start" | "host" | "join" | "waiting">(
    "start",
  );

  // We need to set the session ID in the store when joining
  const setSessionId = useStore((state: any) => state.setSessionId);

  const handleStartSession = () => {
    // Transition to Host Dashboard
    setView("host");
  };

  const handleJoinSession = (sessionId: string) => {
    // Save the entered session ID and transition to Registration
    if (setSessionId) setSessionId(sessionId);
    setView("join");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-green-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Bossel-Vibe</h1>
      </header>

      <main className="container mx-auto max-w-md p-4 space-y-8">
        {view === "start" && (
          <StartPage
            onStartSession={handleStartSession}
            onJoinSession={handleJoinSession}
          />
        )}

        {view === "host" && <HostDashboard />}

        {view === "join" && (
          <div className="space-y-8">
            <PlayerRegistration />
            {/* Temporary link to test the waiting room */}
            <div className="text-center pt-4 border-t border-slate-200">
              <button
                onClick={() => setView("waiting")}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 underline"
              >
                Go to Waiting Room (Test)
              </button>
            </div>
          </div>
        )}

        {view === "waiting" && <WaitingRoom />}
      </main>
    </div>
  );
}

export default App;
