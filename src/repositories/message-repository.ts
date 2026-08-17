import database from "../database/database.js";



export interface Message {
  id: number;
  groupId: number;
  userId: number;
  username: string;
  content: string;
  createdAt: string;
}

interface MessageRow {
  id: number;
  group_id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
}

export class MessageRepository {
  create(
    groupId: number,
    userId: number,
    content: string
  ): Message {
    const statement = database.prepare(`
      INSERT INTO messages (
        group_id,
        user_id,
        content
      )
      VALUES (?, ?, ?)
    `);

    const result = statement.run(
      groupId,
      userId,
      content
    );

    return this.findById(
      Number(result.lastInsertRowid)
    )!;
  }

  findById(
    messageId: number
  ): Message | undefined {
    const row = database
      .prepare(`
        SELECT
        m.id,
        m.group_id,
        m.user_id,
        u.username,
        m.content,
        m.created_at
        FROM messages m
        INNER JOIN users u
        ON u.id = m.user_id
        WHERE m.id = ?
      `)
      .get(messageId) as MessageRow | undefined;

    if (!row) {
      return undefined;
    }

    return this.mapMessage(row);
  }

  findByGroup(
    groupId: number,
    limit: number,
    offset: number
  ): Message[] {
    const rows = database
      .prepare(`
        SELECT
        m.id,
        m.group_id,
        m.user_id,
        u.username,
        m.content,
        m.created_at
        FROM messages m
        INNER JOIN users u
        ON u.id = m.user_id
        WHERE m.group_id = ?
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ?
        OFFSET ?
      `)
      .all(
        groupId,
        limit,
        offset
      ) as MessageRow[];

    return rows.map((row) =>
      this.mapMessage(row)
    );
  }

  private mapMessage(
    row: MessageRow
  ): Message {
    return {
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      username: row.username,
      content: row.content,
      createdAt: row.created_at
    };
  }
}