import { Chess } from 'chess.js';
import { createLogger } from '../core/logger';

const log = createLogger('action:chess');

// Lightweight chess move evaluation
// Uses chess.js for move validation and basic position analysis

export class ChessEngine {
  private game: Chess;

  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  loadFEN(fen: string): void {
    this.game.load(fen);
  }

  getMoves(): string[] {
    return this.game.moves();
  }

  makeMove(move: string): boolean {
    try {
      this.game.move(move);
      return true;
    } catch {
      return false;
    }
  }

  getFEN(): string {
    return this.game.fen();
  }

  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  turn(): 'w' | 'b' {
    return this.game.turn();
  }

  // Simple material evaluation
  evaluate(): number {
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let score = 0;

    const board = this.game.board();
    for (const row of board) {
      for (const sq of row) {
        if (!sq) continue;
        const val = values[sq.type] || 0;
        score += sq.color === 'w' ? val : -val;
      }
    }

    return score;
  }

  // Pick a reasonable move (not optimal, but not random)
  suggestMove(): string | null {
    const moves = this.game.moves();
    if (moves.length === 0) return null;

    // Prefer captures, checks, then random
    const captures = moves.filter(m => m.includes('x'));
    const checks = moves.filter(m => m.includes('+'));

    if (checks.length > 0) return checks[Math.floor(Math.random() * checks.length)];
    if (captures.length > 0 && Math.random() > 0.3) {
      return captures[Math.floor(Math.random() * captures.length)];
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  moveHistory(): string[] {
    return this.game.history();
  }
}
