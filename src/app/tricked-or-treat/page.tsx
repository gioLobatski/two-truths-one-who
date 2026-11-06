"use client";

import { useCallback, useState } from "react";
import {
  createFactOrLieGame,
  factOrLieGameExists,
  joinFactOrLieGame,
} from "@/lib/factOrLieService";
import { useFactOrLieGame } from "@/hooks/useFactOrLieGame";
import { sessionKeys, getStored, setStored, clearStored } from "@/lib/storage";
import { LOGOS } from "@/components/Logo";
import { LobbyScreen } from "@/components/LobbyScreen";
import { GameOverScreen } from "@/components/GameOverScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SplashScreen } from "@/components/SplashScreen";
import { ConnectButton } from "@/components/ConnectButton";
import { HelpButton } from "@/components/HelpManual";
import { FolHomeScreen } from "@/components/factOrLie/FolHomeScreen";
import { FolSubmissionScreen } from "@/components/factOrLie/FolSubmissionScreen";
import { FolVotingScreen } from "@/components/factOrLie/FolVotingScreen";
import { FolRoundResultScreen } from "@/components/factOrLie/FolRoundResultScreen";
import { FolManualContent } from "@/components/factOrLie/FolHelp";

// Tricked or Treat keeps its own session keys so tabs opened for either game
// don't clobber each other (see src/lib/storage.ts).
const KEYS = sessionKeys("tricked-or-treat");

const SplashTitle = (
  <h1 className="font-heading text-center text-2xl font-black tracking-tight text-balance text-white sm:text-4xl">
    <span className="text-orange-400">Tricked</span>{" "}
    <span className="text-emerald-400">or Treat</span>
  </h1>
);

export default function TrickedOrTreatPage() {
  const [gameId, setGameId] = useState<string | null>(getStored(KEYS.gameId));
  const [playerId, setPlayerId] = useState<string | null>(
    getStored(KEYS.playerId),
  );
  const [isHost, setIsHost] = useState(() => getStored(KEYS.host) === "1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const { state, loading: stateLoading, actions } = useFactOrLieGame(gameId);

  // Create a new game. When a name is given the creator joins as a player;
  // with null they run the room as a moderating host (no player entry) —
  // and only a moderating host gets the private truth peek.
  const handleCreateGame = useCallback(async (name: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const id = await createFactOrLieGame();
      setStored(KEYS.gameId, id);
      setStored(KEYS.host, "1");
      if (name) {
        const player = await joinFactOrLieGame(id, name);
        setStored(KEYS.playerId, player.id);
        setPlayerId(player.id);
      } else {
        localStorage.removeItem(KEYS.playerId);
        setPlayerId(null);
      }
      setGameId(id);
      setIsHost(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  }, []);

  // Join an existing game
  const handleJoinGame = useCallback(
    async (code: string, name: string) => {
      setLoading(true);
      setError(null);
      try {
        const exists = await factOrLieGameExists(code);
        if (!exists) {
          setError("Game not found. Check the code and try again.");
          return;
        }
        const player = await joinFactOrLieGame(code, name);
        setStored(KEYS.gameId, code);
        setStored(KEYS.playerId, player.id);
        setGameId(code);
        setPlayerId(player.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join game");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Leave game — back to the game picker
  const handleLeave = useCallback(() => {
    clearStored(KEYS);
    setGameId(null);
    setPlayerId(null);
    setIsHost(false);
  }, []);

  if (showSplash) {
    return (
      <div className="theme-tot">
        <SplashScreen
          title={SplashTitle}
          logo={LOGOS.trickedOrTreat}
          onComplete={() => setShowSplash(false)}
        />
      </div>
    );
  }

  // Show home screen if no game
  if (!gameId) {
    return (
      <div className="theme-tot">
        <FolHomeScreen
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          loading={loading}
        />
        {error && (
          <p className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-rose-500/90 px-4 py-2 text-sm text-white shadow-lg">
            {error}
          </p>
        )}
        <ConnectButton />
        <HelpButton content={<FolManualContent />} />
      </div>
    );
  }

  // Loading state
  if (stateLoading || !state || !gameId) {
    return (
      <div className="theme-tot">
        <LoadingScreen label="Loading game" logo={LOGOS.trickedOrTreat} />
      </div>
    );
  }

  const game = state;
  const activeGameId = gameId;

  // Scoring/voting actions talk to Supabase directly; without this wrapper a
  // rejected write (e.g. a schema column missing) would die silently as an
  // unhandled rejection. Surface it instead.
  function runQuietly(fn: () => Promise<void>) {
    setError(null);
    fn().catch((err) =>
      setError(err instanceof Error ? err.message : "Action failed"),
    );
  }

  const currentRound = game.rounds[game.currentRoundIndex];
  const isLastRound = game.currentRoundIndex === game.rounds.length - 1;

  function renderPhase() {
    switch (game.phase) {
      case "lobby":
        return (
          <LobbyScreen
            gameId={activeGameId}
            players={game.players}
            isHost={isHost}
            isModerator={isHost && !game.players.some((p) => p.id === playerId)}
            onStart={() => runQuietly(() => actions.startSubmission())}
            onLeave={handleLeave}
            submitLabel="Start — write your statements"
            moderatorNotice="You're running this room — you'll deal each round without writing statements or voting. The truth stays hidden until you click the peek button, so you can screen-share safely."
          />
        );

      case "submission":
        return (
          <FolSubmissionScreen
            players={game.players}
            playerId={playerId}
            onSetStatements={(pid, statements, avatar) =>
              runQuietly(() => actions.setStatements(pid, statements, avatar))
            }
            onStartGame={(roundCount) =>
              runQuietly(() => actions.startGame(roundCount))
            }
            isHost={isHost}
          />
        );

      case "reveal":
      case "voting":
        if (!currentRound) return null;
        return (
          <FolVotingScreen
            round={currentRound}
            players={game.players}
            playerId={playerId}
            roundNumber={game.currentRoundIndex + 1}
            totalRounds={game.rounds.length}
            phase={game.phase}
            phaseStartedAt={game.phaseStartedAt}
            onOpenVoting={() => runQuietly(() => actions.startVoting())}
            onSubmitVote={(voterId, vote) =>
              runQuietly(() => actions.submitVote(voterId, vote))
            }
            onScore={() => runQuietly(() => actions.scoreRound())}
            isHost={isHost}
          />
        );

      case "roundResult":
        if (!currentRound) return null;
        return (
          <FolRoundResultScreen
            round={currentRound}
            players={game.players}
            isLastRound={isLastRound}
            onNext={() => runQuietly(() => actions.nextRound())}
            isHost={isHost}
          />
        );

      case "gameOver":
        return (
          <GameOverScreen players={game.players} onPlayAgain={handleLeave} />
        );

      default:
        return null;
    }
  }

  return (
    <div className="theme-tot">
      {renderPhase()}
      {error && (
        <p className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-rose-500/90 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </p>
      )}
      <ConnectButton />
      <HelpButton content={<FolManualContent />} />
    </div>
  );
}
