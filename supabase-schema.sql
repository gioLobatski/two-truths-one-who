-- ============================================================================
-- Two Truths, One Who — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================================
-- GAMES: One row per game session
-- Maps to: GameState { phase, currentRoundIndex }
-- ============================================================================
create table public.games (
  id uuid primary key default uuid_generate_v4(),
  phase text not null default 'lobby'
    check (phase in ('lobby', 'submission', 'reveal', 'guessing', 'roundResult', 'gameOver')),
  current_round_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- PLAYERS: Each player belongs to one game
-- Maps to: Player { id, name, truths, score }
-- ============================================================================
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  truths text[] not null default '{}',  -- fixed length of 2 once submitted
  score integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROUNDS: Each (player, truth) pair becomes one round, shuffled at game start
-- Maps to: Round { id, authorId, truth, guesses }
-- ============================================================================
create table public.rounds (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references public.games(id) on delete cascade,
  author_id uuid not null references public.players(id) on delete cascade,
  truth text not null,
  round_index integer not null,  -- position in shuffled order
  created_at timestamptz not null default now()
);

-- ============================================================================
-- GUESSES: Each guesser's answer for a round
-- Maps to: Round.guesses { guesserId -> guessedId }
-- ============================================================================
create table public.guesses (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  guesser_id uuid not null references public.players(id) on delete cascade,
  guessed_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (round_id, guesser_id)  -- one guess per guesser per round
);

-- ============================================================================
-- INDEXES for common queries
-- ============================================================================
create index idx_players_game_id on public.players(game_id);
create index idx_rounds_game_id on public.rounds(game_id);
create index idx_rounds_author_id on public.rounds(author_id);
create index idx_guesses_round_id on public.guesses(round_id);
create index idx_guesses_guesser_id on public.guesses(guesser_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- For now: allow all operations (adjust later for production)
-- ============================================================================
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.guesses enable row level security;

-- Allow full access for development (replace with proper auth policies later)
create policy "Allow all on games" on public.games for all using (true) with check (true);
create policy "Allow all on players" on public.players for all using (true) with check (true);
create policy "Allow all on rounds" on public.rounds for all using (true) with check (true);
create policy "Allow all on guesses" on public.guesses for all using (true) with check (true);

-- ============================================================================
-- REALTIME: Enable for multiplayer sync
-- ============================================================================
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.guesses;
