import Database from 'better-sqlite3';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { AuthCredentials } from '../../shared/types';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
}

export class AuthService {
  constructor(private readonly db: Database.Database) {}

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const existing = this.db.prepare('SELECT COUNT(1) as count FROM users').get() as { count: number };
    if (existing.count === 0) {
      this.createUser({ username: 'admin', password: 'admin123!' });
    }
  }

  createUser(credentials: AuthCredentials): void {
    const salt = randomBytes(16).toString('hex');
    const hash = this.hashPassword(credentials.password, salt);
    this.db
      .prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)')
      .run(credentials.username, hash, salt);
  }

  verify(credentials: AuthCredentials): boolean {
    const row = this.db
      .prepare('SELECT id, username, password_hash, salt FROM users WHERE username = ?')
      .get(credentials.username) as UserRow | undefined;

    if (!row) return false;

    const provided = this.hashPassword(credentials.password, row.salt);
    return timingSafeEqual(Buffer.from(row.password_hash, 'hex'), Buffer.from(provided, 'hex'));
  }

  private hashPassword(password: string, salt: string): string {
    return scryptSync(password, salt, 32).toString('hex');
  }
}
