import database from "../database/database.js";

export interface UserRecord {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export class UserRepository {
  private readonly findByUsernameStatement = database.prepare(`
    SELECT
      id,
      username,
      password_hash,
      created_at
    FROM users
    WHERE username = ?
  `);

  private readonly findByIdStatement = database.prepare(`
    SELECT
      id,
      username,
      password_hash,
      created_at
    FROM users
    WHERE id = ?
  `);

  private readonly createStatement = database.prepare(`
    INSERT INTO users (
      username,
      password_hash
    )
    VALUES (?, ?)
  `);

  findByUsername(username: string): UserRecord | null {
    const row = this.findByUsernameStatement.get(
      username
    ) as UserRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  findById(id: number): UserRecord | null {
    const row = this.findByIdStatement.get(
      id
    ) as UserRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  create(
    username: string,
    passwordHash: string
  ): UserRecord {
    const result = this.createStatement.run(
      username,
      passwordHash
    );

    const user = this.findById(Number(result.lastInsertRowid));

    if (!user) {
      throw new Error("USER_CREATION_FAILED");
    }

    return user;
  }

  private mapRow(row: UserRow): UserRecord {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: row.created_at
    };
  }
}