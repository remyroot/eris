import net from 'net';
import { createLogger } from '../core/logger';

const log = createLogger('action:factorio');

// Factorio RCON protocol implementation
// https://developer.valvesoftware.com/wiki/Source_RCON_Protocol

const SERVERDATA_AUTH = 3;
const SERVERDATA_AUTH_RESPONSE = 2;
const SERVERDATA_EXECCOMMAND = 2;
const SERVERDATA_RESPONSE_VALUE = 0;

export class FactorioClient {
  private host: string;
  private port: number;
  private password: string;
  private socket: net.Socket | null = null;
  private requestId = 0;
  private authenticated = false;
  private pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>();

  constructor() {
    this.host = process.env.FACTORIO_RCON_HOST || 'localhost';
    this.port = parseInt(process.env.FACTORIO_RCON_PORT || '27015');
    this.password = process.env.FACTORIO_RCON_PASSWORD || '';
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, this.host, () => {
        log.info('connected to factorio RCON');
        this.authenticate().then(resolve).catch(reject);
      });

      this.socket.on('data', (data) => this.handleData(data));
      this.socket.on('error', (err) => {
        log.error('RCON socket error', err);
        reject(err);
      });
      this.socket.on('close', () => {
        this.authenticated = false;
        log.info('RCON connection closed');
      });
    });
  }

  private async authenticate(): Promise<void> {
    const id = this.nextId();
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: () => {
          this.authenticated = true;
          resolve();
        },
        reject,
      });
      this.sendPacket(id, SERVERDATA_AUTH, this.password);
    });
  }

  async command(cmd: string): Promise<string> {
    if (!this.authenticated) throw new Error('not authenticated');
    const id = this.nextId();

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.sendPacket(id, SERVERDATA_EXECCOMMAND, cmd);

      // Timeout after 10s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('RCON command timeout'));
        }
      }, 10000);
    });
  }

  private sendPacket(id: number, type: number, body: string): void {
    if (!this.socket) throw new Error('not connected');
    const bodyBuf = Buffer.from(body, 'utf8');
    const size = 10 + bodyBuf.length;
    const buf = Buffer.alloc(4 + size);
    buf.writeInt32LE(size, 0);
    buf.writeInt32LE(id, 4);
    buf.writeInt32LE(type, 8);
    bodyBuf.copy(buf, 12);
    buf.writeInt8(0, 12 + bodyBuf.length);
    buf.writeInt8(0, 13 + bodyBuf.length);
    this.socket.write(buf);
  }

  private handleData(data: Buffer): void {
    if (data.length < 14) return;
    const id = data.readInt32LE(4);
    const type = data.readInt32LE(8);
    const body = data.slice(12, data.length - 2).toString('utf8');

    const handler = this.pending.get(id);
    if (handler) {
      this.pending.delete(id);
      if (type === SERVERDATA_AUTH_RESPONSE && id === -1) {
        handler.reject(new Error('RCON authentication failed'));
      } else {
        handler.resolve(body);
      }
    }
  }

  private nextId(): number {
    return ++this.requestId;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.authenticated = false;
    }
  }

  isConnected(): boolean {
    return this.authenticated;
  }
}
// v2: handle fragmented RCON packets
