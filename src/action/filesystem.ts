import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../core/logger';

const log = createLogger('action:filesystem');

export class FileSystem {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || process.env.DATA_DIR || './data';
  }

  async writeNote(filename: string, content: string): Promise<string> {
    const dir = path.join(this.dataDir, 'notes');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content, 'utf8');
    log.debug(`wrote note: ${filename} (${content.length} bytes)`);
    return filePath;
  }

  async readNote(filename: string): Promise<string | null> {
    const filePath = path.join(this.dataDir, 'notes', filename);
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  async listNotes(): Promise<string[]> {
    const dir = path.join(this.dataDir, 'notes');
    try {
      return await fs.readdir(dir);
    } catch {
      return [];
    }
  }

  async savePDF(url: string, filename: string): Promise<string> {
    const dir = path.join(this.dataDir, 'corpus');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filePath, buf);

    log.debug(`saved PDF: ${filename} (${buf.length} bytes)`);
    return filePath;
  }

  async exportJSON(filename: string, data: unknown): Promise<string> {
    const dir = path.join(this.dataDir, 'exports');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return filePath;
  }

  async getDiskUsage(): Promise<{ files: number; totalBytes: number }> {
    let files = 0;
    let totalBytes = 0;

    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else {
            const stat = await fs.stat(full);
            files++;
            totalBytes += stat.size;
          }
        }
      } catch { /* skip inaccessible dirs */ }
    };

    await walk(this.dataDir);
    return { files, totalBytes };
  }
}
