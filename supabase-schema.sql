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

-- ============================================================================
-- ============================================================================
-- FACT OR LIE — second game mode (working title, rename-safe table names)
-- Migration: safe to run on top of the existing schema; touches nothing above
-- except a bookkeeping column on games.
-- ============================================================================

-- Bookkeeping only — routing between games is by URL, not by this column.
-- Existing rows get the 'two_truths' default.
alter table public.games
  add column if not exists game_type text not null default 'two_truths'
    check (game_type in ('two_truths', 'fact_or_lie'));

-- ============================================================================
-- FACT_OR_LIE_GAMES: One row per game session
-- Maps to: FactOrLieState { phase, currentRoundIndex }
-- ============================================================================
create table public.fact_or_lie_games (
  id uuid primary key default uuid_generate_v4(),
  phase text not null default 'lobby'
    check (phase in ('lobby', 'submission', 'reveal', 'voting', 'roundResult', 'gameOver')),
  current_round_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- FACT_OR_LIE_PLAYERS: Each player belongs one game (statements live in
-- fact_or_lie_statements so each can carry its hidden fact/lie flag)
-- Maps to: FolPlayer { id, name, score }
-- ============================================================================
create table public.fact_or_lie_players (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references public.fact_or_lie_games(id) on delete cascade,
  name text not null,
  avatar text not null default '🎃',  -- festive emoji shown in the gingerbread head
  score integer not null default 0,
  missed_votes integer not null default 0,  -- naughty-list counter: rounds skipped without voting
  created_at timestamptz not null default now()
);

-- ============================================================================
-- FACT_OR_LIE_STATEMENTS: Two per player. `declared` is the player's private
-- claim — never shown to voters, only used for scoring and the GM peek.
-- Maps to: FolStatement { text, declared }
-- ============================================================================
create table public.fact_or_lie_statements (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references public.fact_or_lie_players(id) on delete cascade,
  text text not null default '',
  declared text not null default 'fact'
    check (declared in ('fact', 'lie')),
  position smallint not null check (position in (0, 1)),
  created_at timestamptz not null default now(),
  unique (player_id, position)  -- one upsert slot per statement per player
);

-- ============================================================================
-- FACT_OR_LIE_ROUNDS: One statement per round, shuffled deck built at start
-- Maps to: FolRound { id, statementId, votes }
-- ============================================================================
create table public.fact_or_lie_rounds (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid not null references public.fact_or_lie_games(id) on delete cascade,
  statement_id uuid not null references public.fact_or_lie_statements(id) on delete cascade,
  round_index integer not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- FACT_OR_LIE_VOTES: Each voter's Fact/Lie call for a round
-- Maps to: FolRound.votes { voterId -> 'fact' | 'lie' }
-- ============================================================================
create table public.fact_or_lie_votes (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid not null references public.fact_or_lie_rounds(id) on delete cascade,
  voter_id uuid not null references public.fact_or_lie_players(id) on delete cascade,
  vote text not null check (vote in ('fact', 'lie')),
  created_at timestamptz not null default now(),
  unique (round_id, voter_id)  -- one vote per voter per round
);

-- ============================================================================
-- INDEXES for common queries
-- ============================================================================
create index idx_fol_players_game_id on public.fact_or_lie_players(game_id);
create index idx_fol_statements_player_id on public.fact_or_lie_statements(player_id);
create index idx_fol_rounds_game_id on public.fact_or_lie_rounds(game_id);
create index idx_fol_rounds_statement_id on public.fact_or_lie_rounds(statement_id);
create index idx_fol_votes_round_id on public.fact_or_lie_votes(round_id);
create index idx_fol_votes_voter_id on public.fact_or_lie_votes(voter_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — permissive, same dev posture as game 1
-- ============================================================================
alter table public.fact_or_lie_games enable row level security;
alter table public.fact_or_lie_players enable row level security;
alter table public.fact_or_lie_statements enable row level security;
alter table public.fact_or_lie_rounds enable row level security;
alter table public.fact_or_lie_votes enable row level security;

create policy "Allow all on fact_or_lie_games" on public.fact_or_lie_games for all using (true) with check (true);
create policy "Allow all on fact_or_lie_players" on public.fact_or_lie_players for all using (true) with check (true);
create policy "Allow all on fact_or_lie_statements" on public.fact_or_lie_statements for all using (true) with check (true);
create policy "Allow all on fact_or_lie_rounds" on public.fact_or_lie_rounds for all using (true) with check (true);
create policy "Allow all on fact_or_lie_votes" on public.fact_or_lie_votes for all using (true) with check (true);

-- ============================================================================
-- REALTIME: Enable for multiplayer sync
-- ============================================================================
alter publication supabase_realtime add table public.fact_or_lie_games;
alter publication supabase_realtime add table public.fact_or_lie_players;
alter publication supabase_realtime add table public.fact_or_lie_statements;
alter publication supabase_realtime add table public.fact_or_lie_rounds;
alter publication supabase_realtime add table public.fact_or_lie_votes;
