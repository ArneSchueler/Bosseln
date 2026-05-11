import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useBosselGame(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`sessions-${sessionId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'sessions', 
          filter: `id=eq.${sessionId}` 
        },
        async (payload) => {
          const newActivePlayerId = payload.new.active_player_id;
          const oldActivePlayerId = payload.old?.active_player_id;

          // Only trigger if active_player_id changed and is not null
          if (newActivePlayerId && newActivePlayerId !== oldActivePlayerId) {
            
            // Trigger vibration (if supported)
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }

            // Fetch the player's audio URL
            const { data: player, error } = await supabase
              .from('players')
              .select('audio_url')
              .eq('id', newActivePlayerId)
              .single();

            if (!error && player?.audio_url) {
              const audio = new Audio(player.audio_url);
              audio.play().catch((e) => console.warn('Audio play failed:', e));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const addThrow = useCallback(
    async (playerId: string, roundNumber: number, throwCount: number) => {
      if (!sessionId) {
        console.error('No active session to add throw to.');
        return { error: new Error('No active session') };
      }

      const { data, error } = await supabase.from('throws').insert({
        player_id: playerId,
        session_id: sessionId,
        round_number: roundNumber,
        throw_count: throwCount,
      }).select();

      if (error) {
        console.error('Error adding throw:', error);
      }
      return { data, error };
    },
    [sessionId]
  );

  return { addThrow };
}