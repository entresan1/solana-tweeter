import { PublicKey } from '@solana/web3.js';
import { format, formatRelative } from 'date-fns';

export interface ITweet {
  id?: number;
  publicKey: PublicKey;
  author: PublicKey;
  topic: string;
  content: string;
  timestamp: number;
  treasuryTransaction?: string;
  authorDisplay?: string;
  account?: {
    author: PublicKey;
    timestamp: Date;
    topic: string;
    content: string;
  };
}

export class TweetModel implements ITweet {
  id?: number;
  publicKey: PublicKey;
  author: PublicKey;
  topic: string;
  content: string;
  timestamp: number;
  treasuryTransaction?: string;
  authorDisplay?: string;
  account?: {
    author: PublicKey;
    timestamp: Date;
    topic: string;
    content: string;
  };

  constructor(publicKey: PublicKey, accountData: any) {
    this.publicKey = publicKey;
    this.author = accountData.author;
    this.timestamp = accountData.timestamp.toNumber() * 1000;
    this.topic = accountData.topic;
    this.content = accountData.content;
    
    // Handle new properties
    if (accountData.id) this.id = accountData.id;
    if (accountData.treasuryTransaction) this.treasuryTransaction = accountData.treasuryTransaction;
    if (accountData.author_display) this.authorDisplay = accountData.author_display;
    if (accountData.account) this.account = accountData.account;
    
    console.log('🏗️ TweetModel constructor called with:', { 
      id: this.id, 
      publicKey: this.publicKey.toBase58(),
      author: this.author.toBase58(),
      topic: this.topic,
      content: this.content
    });
  }

  get key() {
    return this.publicKey.toBase58();
  }

  get author_display() {
    if (this.authorDisplay) return this.authorDisplay;
    const author = this.author.toBase58();
    return author.slice(0, 4) + '..' + author.slice(-4);
  }

  get created_at() {
    return format(this.timestamp, 'LLL');
  }

  get created_ago() {
    return formatRelative(this.timestamp, new Date());
  }
}
