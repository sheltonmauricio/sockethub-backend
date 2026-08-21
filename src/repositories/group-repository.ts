import database from "../database/database.js";

export interface Group {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
}

export interface GroupMember {
  id: number;
  username: string;
  joinedAt: string;
}

interface GroupRow {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
}

interface GroupMemberRow {
  id: number;
  username: string;
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

  createWithOwner(
    name: string,
    ownerId: number
  ): Group {
    const transaction = database.transaction(() => {
      const result = database
        .prepare(`
          INSERT INTO groups (name, owner_id)
          VALUES (?, ?)
        `)
        .run(name, ownerId);

      const groupId =
        Number(result.lastInsertRowid);

      database
        .prepare(`
          INSERT INTO group_members (
            group_id,
            user_id
          )
          VALUES (?, ?)
        `)
        .run(groupId, ownerId);

      const group =
        this.findById(groupId);

      if (!group) {
        throw new Error(
          "GROUP_CREATION_FAILED"
        );
      }

      return group;
    });

    return transaction();
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
          u.id,
          u.username,
          gm.joined_at
        FROM group_members gm
        INNER JOIN users u
          ON u.id = gm.user_id
        WHERE gm.group_id = ?
        ORDER BY gm.joined_at ASC
      `)
      .all(groupId) as GroupMemberRow[];

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
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