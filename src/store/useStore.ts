import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Player {
  id: string;
  session_id?: string;
  name: string;
  audioBlob?: Blob | null; // Local only
  audioUrl?: string; // object URL or Supabase public URL
  team?: number | null;
}

interface GameState {
  sessionId: string | null;
  players: Player[];
  teamCount: number;
  isGameStarted: boolean;
  activeTeamId: number | null;
  activePlayerIndexByTeam: Record<number, number>;
  myPlayerId: string | null;
  scores: Record<number, number>;

  initSession: (sessionId: string) => Promise<void>;
  setMyPlayerId: (id: string) => void;
  addPlayer: (player: Player) => Promise<void>;
  setTeamCount: (count: number) => Promise<void>;
  distributeTeams: () => Promise<void>;
  startGame: () => Promise<void>;
  nextTurn: () => Promise<void>;
  addScore: (teamId: number, points: number) => Promise<void>;
  
  // Handlers for remote updates
  _setGameStateFromServer: (payload: any) => void;
  _setPlayersFromServer: (payload: any[]) => void;
}

export const useStore = create<GameState>((set, get) => ({
  sessionId: null,
  players: [],
  teamCount: 2,
  isGameStarted: false,
  activeTeamId: null,
  activePlayerIndexByTeam: {},
  scores: {},
  myPlayerId: null,

  initSession: async (sessionId) => {
    set({ sessionId });
    
    // 1. Ensure game_state row exists
    await supabase.from('game_state').upsert(
      { session_id: sessionId },
      { onConflict: 'session_id', ignoreDuplicates: true }
    );

    // 2. Fetch initial data
    const [{ data: gameData }, { data: playersData }] = await Promise.all([
      supabase.from('game_state').select('*').eq('session_id', sessionId).single(),
      supabase.from('players').select('*').eq('session_id', sessionId)
    ]);

    if (gameData) get()._setGameStateFromServer(gameData);
    if (playersData) get()._setPlayersFromServer(playersData);

    // 3. Subscribe to Realtime changes
    supabase.channel(`game-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.new) get()._setGameStateFromServer(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` },
        async () => {
          // Simplest way to sync players: re-fetch all for this session
          const { data } = await supabase.from('players').select('*').eq('session_id', sessionId);
          if (data) get()._setPlayersFromServer(data);
        }
      )
      .subscribe();
  },

  _setGameStateFromServer: (payload) => {
    set({
      teamCount: payload.team_count ?? 2,
      isGameStarted: payload.is_game_started ?? false,
      activeTeamId: payload.active_team_id ?? null,
      activePlayerIndexByTeam: payload.active_player_index_by_team ?? {},
      scores: payload.scores ?? {}
    });
  },

  _setPlayersFromServer: (playersData) => {
    set({
      players: playersData.map((p) => ({
        id: p.id,
        session_id: p.session_id,
        name: p.name,
        audioUrl: p.audio_url,
        team: p.team
      }))
    });
  },

  setMyPlayerId: (id) => set({ myPlayerId: id }),

  addPlayer: async (player) => {
    // Only update local state, DB insert is handled in PlayerRegistration
    set((state) => ({ players: [...state.players, player] }));
  },
  
  setTeamCount: async (count) => {
    const state = get();
    if (!state.sessionId) return;
    set({ teamCount: count });
    await supabase.from('game_state').update({ team_count: count }).eq('session_id', state.sessionId);
  },
  
  distributeTeams: async () => {
    const state = get();
    const { players, teamCount, sessionId } = state;
    if (!sessionId || players.length === 0 || teamCount <= 0) return;

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const playersWithTeams = shuffled.map((player, index) => ({
      ...player,
      team: (index % teamCount) + 1,
    }));

    // Optimistic
    set({ players: playersWithTeams });

    // Remote update players
    const upserts = playersWithTeams.map(p => ({
      id: p.id,
      session_id: sessionId,
      name: p.name,
      audio_url: p.audioUrl,
      team: p.team
    }));
    await supabase.from('players').upsert(upserts);
  },

  startGame: async () => {
    const state = get();
    const { players, teamCount, sessionId } = state;
    const hasTeams = players.some(p => p.team);
    if (!sessionId || !hasTeams || players.length === 0) return;

    const initialIndices: Record<number, number> = {};
    const initialScores: Record<number, number> = {};
    for (let i = 1; i <= teamCount; i++) {
      initialIndices[i] = 0;
      initialScores[i] = 0;
    }

    const updates = {
      is_game_started: true,
      active_team_id: 1,
      active_player_index_by_team: initialIndices,
      scores: initialScores,
    };

    set({
      isGameStarted: true,
      activeTeamId: 1,
      activePlayerIndexByTeam: initialIndices,
      scores: initialScores,
    });

    await supabase.from('game_state').update(updates).eq('session_id', sessionId);
  },

  nextTurn: async () => {
    const state = get();
    if (!state.sessionId || !state.isGameStarted || state.activeTeamId === null) return;

    const currentTeamId = state.activeTeamId;
    const teamPlayers = state.players.filter(p => p.team === currentTeamId);
    
    const currentIdx = state.activePlayerIndexByTeam[currentTeamId] || 0;
    const nextIdx = teamPlayers.length > 0 ? (currentIdx + 1) % teamPlayers.length : 0;
    
    const newIndices = {
      ...state.activePlayerIndexByTeam,
      [currentTeamId]: nextIdx
    };

    let nextTeamId = currentTeamId + 1;
    if (nextTeamId > state.teamCount) {
      nextTeamId = 1;
    }

    set({
      activePlayerIndexByTeam: newIndices,
      activeTeamId: nextTeamId
    });

    await supabase.from('game_state').update({
      active_player_index_by_team: newIndices,
      active_team_id: nextTeamId
    }).eq('session_id', state.sessionId);
  },

  addScore: async (teamId, points) => {
    const state = get();
    if (!state.sessionId) return;
    
    const newScores = {
      ...state.scores,
      [teamId]: (state.scores[teamId] || 0) + points
    };

    set({ scores: newScores });

    await supabase.from('game_state').update({ scores: newScores }).eq('session_id', state.sessionId);
  },
}));