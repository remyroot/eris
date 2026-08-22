import { BasePerception, ScrapeResult } from './base';
import { createLogger } from '../core/logger';

const log = createLogger('perception:discord');

// Discord gateway/API client for reading messages in monitored channels
// Uses bot token, not user token

interface DiscordMessage {
  id: string;
  content: string;
  author: { id: string; username: string };
  timestamp: string;
  channel_id: string;
}

export class DiscordPerception extends BasePerception {
  name = 'discord';

  private botToken: string;

  constructor() {
    super('perception:discord');
    this.botToken = process.env.DISCORD_BOT_TOKEN || '';
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bot ${this.botToken}`,
      'Content-Type': 'application/json',
    };
  }

  async scrape(channelId?: string): Promise<ScrapeResult[]> {
    if (!channelId) {
      log.warn('no channel ID provided');
      return [];
    }

    if (!this.botToken) {
      log.warn('discord bot token not configured');
      return [];
    }

    const messages = await this.fetchJson<DiscordMessage[]>(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=50`,
      this.headers()
    );

    return messages.map(msg => ({
      source: 'discord',
      url: `https://discord.com/channels/${channelId}/${msg.id}`,
      title: `${msg.author.username}`,
      content: msg.content,
      timestamp: new Date(msg.timestamp).getTime(),
      metadata: {
        authorId: msg.author.id,
        channelId: msg.channel_id,
        messageId: msg.id,
      },
    }));
  }

  async getGuildChannels(guildId: string): Promise<Array<{ id: string; name: string; type: number }>> {
    return this.fetchJson(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      this.headers()
    );
  }
}
