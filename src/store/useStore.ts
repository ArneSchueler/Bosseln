import { create } from 'zustand';

export interface Player {
  id: string;
  name: string;
  audioBlob?: Blob | null;
  audioUrl?: string; // object URL for immediate playback
  team?: number;
}

interface GameState {
  players: Player[];
  teamCount: number;
  isGameStarted: boolean;
  activeTeamId: number | null;
  activePlayerIndexByTeam: Record<number, number>;
  myPlayerId: string | null;
  scores: Record<number, number>;

  setMyPlayerId: (id: string) => void;
  addPlayer: (player: Player) => void;
  setTeamCount: (count: number) => void;
  distributeTeams: () => void;
  startGame: () => void;
  nextTurn: () => void;
  addScore: (teamId: number, points: number) => void;
}

export const useStore = create<GameState>((set) => ({
  players: [],
  teamCount: 2,
  isGameStarted: false,
  activeTeamId: null,
  activePlayerIndexByTeam: {},
  scores: {},
  myPlayerId: null,

  setMyPlayerId: (id) => set({ myPlayerId: id }),

  addPlayer: (player) =>
    set((state) => ({ players: [...state.players, player] })),
  
  setTeamCount: (count) => set({ teamCount: count }),
  
  distributeTeams: () =>
    set((state) => {
      const { players, teamCount } = state;
      if (players.length === 0 || teamCount <= 0) return state;

      // Create a shuffled copy of players
      const shuffled = [...players].sort(() => Math.random() - 0.5);

      // Distribute teams
      const playersWithTeams = shuffled.map((player, index) => ({
        ...player,
        team: (index % teamCount) + 1,
      }));

      return { players: playersWithTeams };
    }),

  startGame: () => 
    set((state) => {
      const { players, teamCount } = state;
      const hasTeams = players.some(p => p.team);
      if (!hasTeams || players.length === 0) return state;

      const initialIndices: Record<number, number> = {};
      const initialScores: Record<number, number> = {};
      
      for (let i = 1; i <= teamCount; i++) {
        initialIndices[i] = 0;
        initialScores[i] = 0;
      }

      return {
        isGameStarted: true,
        activeTeamId: 1, // Start with team 1
        activePlayerIndexByTeam: initialIndices,
        scores: initialScores,
      };
    }),

  nextTurn: () => 
    set((state) => {
      if (!state.isGameStarted || state.activeTeamId === null) return state;

      const currentTeamId = state.activeTeamId;
      const teamPlayers = state.players.filter(p => p.team === currentTeamId);
      
      // Advance player index for the current team
      const currentIdx = state.activePlayerIndexByTeam[currentTeamId];
      const nextIdx = (currentIdx + 1) % teamPlayers.length;
      
      const newIndices = {
        ...state.activePlayerIndexByTeam,
        [currentTeamId]: nextIdx
      };

      // Advance team
      let nextTeamId = currentTeamId + 1;
      if (nextTeamId > state.teamCount) {
        nextTeamId = 1;
      }

      return {
        activePlayerIndexByTeam: newIndices,
        activeTeamId: nextTeamId
      };
    }),

  addScore: (teamId, points) => 
    set((state) => ({
      scores: {
        ...state.scores,
        [teamId]: (state.scores[teamId] || 0) + points
      }
    })),
}));