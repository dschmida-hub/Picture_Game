-- games, players, and votes have no indexes at all, including on
-- room_code/game_id - the exact columns queried on every single poll
-- cycle (every 2s per active client). At current table sizes this
-- isn't the dominant cost, but it's a real gap that gets worse as the
-- app grows and costs nothing to fix now. Run this in Supabase SQL Editor.

create index if not exists games_room_code_idx
  on public.games (room_code, id desc);

create index if not exists players_room_code_idx
  on public.players (room_code);

create index if not exists votes_game_id_idx
  on public.votes (game_id);

create index if not exists votes_room_code_idx
  on public.votes (room_code);

create index if not exists round_history_room_code_idx
  on public.round_history (room_code, round_number desc);
