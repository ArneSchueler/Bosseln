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
  addPlayer: (player: Player) => void;
  setTeamCount: (count: number) => void;
  distributeTeams: () => void;
}

export const useStore = create<GameState>((set) => ({
  players: [],
  teamCount: 2,
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
}));