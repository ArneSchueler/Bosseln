-- Create Game State table
CREATE TABLE game_state (
  session_id TEXT PRIMARY KEY,
  team_count INT NOT NULL DEFAULT 2,
  is_game_started BOOLEAN NOT NULL DEFAULT FALSE,
  active_team_id INT,
  active_player_index_by_team JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Create Players table
CREATE TABLE players (
  id UUID PRIMARY KEY,
  session_id TEXT REFERENCES game_state(session_id),
  name TEXT NOT NULL,
  audio_url TEXT,
  team INT
);

-- Note: You also need to create a Storage Bucket named 'audio' 
-- and make it public in your Supabase Dashboard.