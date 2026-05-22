CREATE INDEX IF NOT EXISTS idx_scores_player_phrase
  ON scores (player_name, phrase_id);

CREATE INDEX IF NOT EXISTS idx_scores_phrase_id
  ON scores (phrase_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_total_score
  ON player_stats (total_score DESC);
