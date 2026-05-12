import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";

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

  initSession: (sessionId: string, isHost?: boolean) => Promise<void>;
  setMyPlayerId: (id: string) => void;
  addPlayer: (player: Player) => Promise<void>;
  setTeamCount: (count: number) => Promise<void>;
  distributeTeams: () => Promise<void>;
  startGame: () => Promise<void>;
  nextTurn: () => Promise<void>;
  addScore: (teamId: number, points: number) => Promise<void>;

  // Handlers for remote updates
  _updateGameStateFromServer: (payload: any) => void;
  _setPlayersFromServer: (payload: any[]) => void;
}

export const useStore = create<GameState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      players: [],
      teamCount: 2,
      isGameStarted: false,
      activeTeamId: null,
      activePlayerIndexByTeam: {},
      scores: {},
      myPlayerId: null,

      initSession: async (sessionId, isHost = false) => {
        set({ sessionId });

        if (isHost) {
          // 1. Ensure game_state exists so players can safely join
          const { error } = await supabase.from("game_state").insert({
            session_id: sessionId,
            team_count: 2,
            is_game_started: false,
          });
          if (error && error.code !== "23505") {
            console.error("Failed to create game_state:", error);
          }
        }

        // 2. Fetch initial data (Legacy support for now, ideally migrate all game_state logic soon)
        const [{ data: gameData }, { data: playersData }] = await Promise.all([
          supabase
            .from("game_state")
            .select("*")
            .eq("session_id", sessionId)
            .single(),
          supabase.from("players").select("*").eq("session_id", sessionId),
        ]);

        if (gameData) get()._updateGameStateFromServer(gameData);
        if (playersData) get()._setPlayersFromServer(playersData);

        // 3. Subscribe to Realtime changes
        const channel = supabase.channel(`game-${sessionId}`);

        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "game_state",
              filter: `session_id=eq.${sessionId}`,
            },
            (payload) => {
              if (payload.new) get()._updateGameStateFromServer(payload.new);
            },
          )
          .on("broadcast", { event: "game-started" }, (payload) => {
            get()._updateGameStateFromServer(payload.payload);
          })
          .on("broadcast", { event: "game-updated" }, (payload) => {
            get()._updateGameStateFromServer(payload.payload);
          });

        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `session_id=eq.${sessionId}`,
          },
          async () => {
            // Re-fetch all players for this session when any player joins or updates
            const { data } = await supabase
              .from("players")
              .select("*")
              .eq("session_id", sessionId);
            if (data) get()._setPlayersFromServer(data);
          },
        );

        channel.on("broadcast", { event: "players-updated" }, async () => {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("session_id", sessionId);
          if (data) get()._setPlayersFromServer(data);
        });

        channel.subscribe();
      },

      _updateGameStateFromServer: (payload) => {
        set((state) => ({
          teamCount:
            payload.team_count !== undefined
              ? payload.team_count
              : state.teamCount,
          isGameStarted:
            payload.is_game_started !== undefined
              ? payload.is_game_started
              : state.isGameStarted,
          activeTeamId:
            payload.active_team_id !== undefined
              ? payload.active_team_id
              : state.activeTeamId,
          activePlayerIndexByTeam:
            payload.active_player_index_by_team !== undefined
              ? payload.active_player_index_by_team
              : state.activePlayerIndexByTeam,
          scores: payload.scores !== undefined ? payload.scores : state.scores,
        }));
      },

      _setPlayersFromServer: (playersData) => {
        set({
          players: playersData.map((p) => ({
            id: p.id,
            session_id: p.session_id,
            name: p.name,
            audioUrl: p.audio_url,
            team: p.team,
          })),
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
        await supabase
          .from("game_state")
          .update({ team_count: count })
          .eq("session_id", state.sessionId);

        supabase.channel(`game-${state.sessionId}`).send({
          type: "broadcast",
          event: "game-updated",
          payload: { team_count: count },
        });
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
        const upserts = playersWithTeams.map((p) => ({
          id: p.id,
          session_id: sessionId,
          name: p.name,
          audio_url: p.audioUrl,
          team: p.team,
        }));
        await supabase.from("players").upsert(upserts);

        supabase.channel(`game-${sessionId}`).send({
          type: "broadcast",
          event: "players-updated",
          payload: { distributed: true },
        });
      },

      startGame: async () => {
        const state = get();
        const { players, teamCount, sessionId } = state;
        const hasTeams = players.some((p) => p.team);
        if (!sessionId || !hasTeams || players.length === 0) return;

        const initialIndices: Record<number, number> = {};
        const initialScores: Record<number, number> = {};
        for (let i = 1; i <= teamCount; i++) {
          initialIndices[i] = 0;
          initialScores[i] = 0;
        }

        const updates = {
          session_id: sessionId,
          team_count: teamCount,
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

        await supabase.from("game_state").upsert(updates);

        supabase.channel(`game-${sessionId}`).send({
          type: "broadcast",
          event: "game-started",
          payload: updates,
        });
      },

      nextTurn: async () => {
        const state = get();
        if (
          !state.sessionId ||
          !state.isGameStarted ||
          state.activeTeamId === null
        )
          return;

        const currentTeamId = state.activeTeamId;
        const teamPlayers = state.players.filter(
          (p) => p.team === currentTeamId,
        );

        const currentIdx = state.activePlayerIndexByTeam[currentTeamId] || 0;
        const nextIdx =
          teamPlayers.length > 0 ? (currentIdx + 1) % teamPlayers.length : 0;

        const newIndices = {
          ...state.activePlayerIndexByTeam,
          [currentTeamId]: nextIdx,
        };

        let nextTeamId = currentTeamId + 1;
        if (nextTeamId > state.teamCount) {
          nextTeamId = 1;
        }

        set({
          activePlayerIndexByTeam: newIndices,
          activeTeamId: nextTeamId,
        });

        await supabase
          .from("game_state")
          .update({
            active_player_index_by_team: newIndices,
            active_team_id: nextTeamId,
          })
          .eq("session_id", state.sessionId);

        supabase.channel(`game-${state.sessionId}`).send({
          type: "broadcast",
          event: "game-updated",
          payload: {
            active_player_index_by_team: newIndices,
            active_team_id: nextTeamId,
          },
        });
      },

      addScore: async (teamId, points) => {
        const state = get();
        if (!state.sessionId) return;

        const newScores = {
          ...state.scores,
          [teamId]: (state.scores[teamId] || 0) + points,
        };

        set({ scores: newScores });

        await supabase
          .from("game_state")
          .update({ scores: newScores })
          .eq("session_id", state.sessionId);

        supabase.channel(`game-${state.sessionId}`).send({
          type: "broadcast",
          event: "game-updated",
          payload: { scores: newScores },
        });
      },
    }),
    {
      name: "bosseln-store",
      partialize: (state) => ({
        sessionId: state.sessionId,
        myPlayerId: state.myPlayerId,
        players: state.players.map((p) => ({ ...p, audioBlob: null })),
        teamCount: state.teamCount,
        isGameStarted: state.isGameStarted,
        activeTeamId: state.activeTeamId,
        activePlayerIndexByTeam: state.activePlayerIndexByTeam,
        scores: state.scores,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.sessionId) {
          // Reconnect to real-time subscriptions without recreating the session
          setTimeout(() => {
            state.initSession(state.sessionId!);
          }, 0);
        }
      },
    },
  ),
);
