import { createLogger } from '../core/logger';

const log = createLogger('action:minecraft');

export interface MCPosition {
  x: number;
  y: number;
  z: number;
}

export interface MCBotConfig {
  host: string;
  port: number;
  username: string;
}

export class MinecraftClient {
  private bot: any = null;
  private config: MCBotConfig;
  private connected = false;

  constructor(config?: Partial<MCBotConfig>) {
    this.config = {
      host: config?.host || process.env.MC_HOST || 'localhost',
      port: config?.port || parseInt(process.env.MC_PORT || '25565'),
      username: config?.username || process.env.MC_USERNAME || 'eris',
    };
  }

  async connect(): Promise<void> {
    try {
      const mineflayer = await import('mineflayer');
      this.bot = mineflayer.createBot({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
      });

      await new Promise<void>((resolve, reject) => {
        this.bot.once('spawn', () => {
          this.connected = true;
          log.info('connected to minecraft server');
          resolve();
        });
        this.bot.once('error', reject);
        setTimeout(() => reject(new Error('connection timeout')), 30000);
      });
    } catch (err) {
      log.error('failed to connect to minecraft', err);
      throw err;
    }
  }

  getPosition(): MCPosition | null {
    if (!this.bot?.entity) return null;
    const pos = this.bot.entity.position;
    return { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
  }

  async moveTo(x: number, y: number, z: number): Promise<void> {
    if (!this.bot) throw new Error('not connected');

    const { pathfinder, Movements, goals } = await import('mineflayer-pathfinder');
    if (!this.bot.pathfinder) {
      this.bot.loadPlugin(pathfinder);
    }

    const movements = new Movements(this.bot);
    this.bot.pathfinder.setMovements(movements);
    this.bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));

    log.debug(`navigating to ${x}, ${y}, ${z}`);
  }

  async placeBlock(x: number, y: number, z: number, blockName: string): Promise<void> {
    if (!this.bot) throw new Error('not connected');
    const block = this.bot.blockAt(this.bot.entity.position.offset(x, y, z));
    if (!block) return;

    const item = this.bot.inventory.items().find((i: any) => i.name === blockName);
    if (!item) {
      log.warn(`${blockName} not in inventory`);
      return;
    }

    await this.bot.equip(item, 'hand');
    await this.bot.placeBlock(block, { x: 0, y: 1, z: 0 });
  }

  async dig(x: number, y: number, z: number): Promise<void> {
    if (!this.bot) throw new Error('not connected');
    const block = this.bot.blockAt({ x, y, z } as any);
    if (!block || block.name === 'air') return;
    await this.bot.dig(block);
  }

  getHealth(): { health: number; food: number } | null {
    if (!this.bot) return null;
    return { health: this.bot.health, food: this.bot.food };
  }

  getNearbyEntities(radius: number = 24): Array<{ name: string; distance: number; type: string }> {
    if (!this.bot) return [];
    const pos = this.bot.entity.position;
    return Object.values(this.bot.entities)
      .filter((e: any) => e.position.distanceTo(pos) <= radius)
      .map((e: any) => ({
        name: e.name || e.username || 'unknown',
        distance: Math.round(e.position.distanceTo(pos) * 10) / 10,
        type: e.type,
      }));
  }

  disconnect(): void {
    if (this.bot) {
      this.bot.quit();
      this.bot = null;
      this.connected = false;
      log.info('disconnected from minecraft');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
