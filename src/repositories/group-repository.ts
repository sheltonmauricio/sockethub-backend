import database from "../database/database.js";

export interface Group {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
}

export interface GroupMember {
  groupId: number;
  userId: number;
  joinedAt: string;
}

interface GroupRow {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
}

interface GroupMemberRow {
  group_id: number;
  user_id: number;
  joined_at: string;
}

export class GroupRepository {
  create(
    name: string,
    ownerId: number
  ): Group {
    const statement = database.prepare(`
      INSERT INTO groups (name, owner_id)
      VALUES (?, ?)
    `);

    const result = statement.run(
      name,
      ownerId
    );

    return this.findById(
      Number(result.lastInsertRowid)
    )!;
  }

  findById(
    groupId: number
  ): Group | undefined {
    const row = database
      .prepare(`
        SELECT
          id,
          name,
          owner_id,
          created_at
        FROM groups
        WHERE id = ?
      `)
      .get(groupId) as GroupRow | undefined;

    if (!row) {
      return undefined;
    }

    return this.mapGroup(row);
  }

  findByName(
    name: string
  ): Group | undefined {
    const row = database
      .prepare(`
        SELECT
          id,
          name,
          owner_id,
          created_at
        FROM groups
        WHERE name = ?
      `)
      .get(name) as GroupRow | undefined;

    if (!row) {
      return undefined;
    }

    return this.mapGroup(row);
  }

  findAll(): Group[] {
    const rows = database
      .prepare(`
        SELECT
          id,
          name,
          owner_id,
          created_at
        FROM groups
        ORDER BY name ASC
      `)
      .all() as GroupRow[];

    return rows.map((row) =>
      this.mapGroup(row)
    );
  }

  addMember(
    groupId: number,
    userId: number
  ): void {
    database
      .prepare(`
        INSERT INTO group_members (
          group_id,
          user_id
        )
        VALUES (?, ?)
      `)
      .run(groupId, userId);
  }

  removeMember(
    groupId: number,
    userId: number
  ): void {
    database
      .prepare(`
        DELETE FROM group_members
        WHERE group_id = ?
          AND user_id = ?
      `)
      .run(groupId, userId);
  }

  isMember(
    groupId: number,
    userId: number
  ): boolean {
    const row = database
      .prepare(`
        SELECT 1
        FROM group_members
        WHERE group_id = ?
          AND user_id = ?
      `)
      .get(groupId, userId);

    return row !== undefined;
  }

  getMembers(
    groupId: number
  ): GroupMember[] {
    const rows = database
      .prepare(`
        SELECT
          group_id,
          user_id,
          joined_at
        FROM group_members
        WHERE group_id = ?
        ORDER BY joined_at ASC
      `)
      .all(groupId) as GroupMemberRow[];

    return rows.map((row) => ({
      groupId: row.group_id,
      userId: row.user_id,
      joinedAt: row.joined_at
    }));
  }

  delete(
    groupId: number
  ): void {
    database
      .prepare(`
        DELETE FROM groups
        WHERE id = ?
      `)
      .run(groupId);
  }

  private mapGroup(
    row: GroupRow
  ): Group {
    return {
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      createdAt: row.created_at
    };
  }
}