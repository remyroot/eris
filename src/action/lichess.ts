import { createLogger } from '../core/logger';

const log = createLogger('action:lichess');
const LICHESS_API = 'https://lichess.org/api';

export interface GameState {
  gameId: string;
  color: 'white' | 'black';
  fen: string;
  moves: string[];
  wtime: number;
  btime: number;
  status: string;
}

export class LichessClient {
  private token: string;
  private currentGame: GameState | null = null;

  constructor() {
    this.token = process.env.LICHESS_TOKEN || '';
  }

  private async apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${LICHESS_API}${path}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`lichess API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private async apiPost<T>(path: string, body?: Record<string, string>): Promise<T> {
    const res = await fetch(`${LICHESS_API}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body ? new URLSearchParams(body).toString() : undefined,
    });
    if (!res.ok) throw new Error(`lichess API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async seekGame(options: { rated?: boolean; time?: number; increment?: number } = {}): Promise<string> {
    const { rated = true, time = 10, increment = 0 } = options;
    log.info(`seeking ${rated ? 'rated' : 'casual'} ${time}+${increment} game`);

    const result = await this.apiPost<{ id: string }>('/board/seek', {
      rated: rated.toString(),
      time: time.toString(),
      increment: increment.toString(),
    });

    return result.id;
  }

  async makeMove(gameId: string, move: string): Promise<void> {
    await this.apiPost(`/board/game/${gameId}/move/${move}`);
    log.debug(`played ${move} in ${gameId}`);
  }

  async getOngoingGames(): Promise<any[]> {
    const data = await this.apiGet<{ nowPlaying: any[] }>('/account/playing');
    return data.nowPlaying || [];
  }

  async getProfile(): Promise<{ username: string; rating: number }> {
    const data = await this.apiGet<any>('/account');
    return {
      username: data.username,
      rating: data.perfs?.rapid?.rating || data.perfs?.blitz?.rating || 1500,
    };
  }

  async getGamePGN(gameId: string): Promise<string> {
    const res = await fetch(`${LICHESS_API}/game/export/${gameId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/x-chess-pgn',
      },
    });
    return res.text();
  }
}
