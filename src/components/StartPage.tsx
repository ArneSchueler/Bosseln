import { useState } from 'react';
import { Play, Users, ArrowRight } from 'lucide-react';

interface StartPageProps {
  onStartSession: () => void;
  onJoinSession: (sessionId: string) => void;
}

export default function StartPage({ onStartSession, onJoinSession }: StartPageProps) {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinId, setJoinId] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      onJoinSession(joinId.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm text-center space-y-8">
        <div>
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome to Bossel-Vibe</h2>
          <p className="text-slate-500 mt-2">Start a new game or join an existing one.</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onStartSession}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <Play className="w-5 h-5" />
            Start a Session
          </button>

          {!showJoinInput ? (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors"
            >
              <Users className="w-5 h-5" />
              Join a Session
            </button>
          ) : (
            <form onSubmit={handleJoinSubmit} className="flex gap-2 animate-in fade-in slide-in-from-top-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Enter Session ID"
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-center uppercase"
                maxLength={8}
              />
              <button
                type="submit"
                disabled={!joinId.trim()}
                className="px-4 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}