import type { ClientConnection } from "./client-connection.js";

export class ConnectionManager {
  private readonly connections = new Set<ClientConnection>();

  private readonly userConnections =
    new Map<number, ClientConnection>();

  add(connection: ClientConnection): void {
    this.connections.add(connection);

    console.log(
      `Conexões ativas: ${this.connections.size}`
    );
  }

  remove(connection: ClientConnection): void {
    this.connections.delete(connection);

    this.unregisterUser(connection);

    console.log(
      `Conexões ativas: ${this.connections.size}`
    );
  }

  registerUser(
    connection: ClientConnection
  ): boolean {
    const user = connection.getUser();

    if (!user) {
      return false;
    }

    if (this.userConnections.has(user.id)) {
      return false;
    }

    this.userConnections.set(
      user.id,
      connection
    );

    return true;
  }

  unregisterUser(
    connection: ClientConnection
  ): void {
    const user = connection.getUser();

    if (!user) {
      return;
    }

    const currentConnection =
      this.userConnections.get(user.id);

    if (currentConnection === connection) {
      this.userConnections.delete(user.id);
    }
  }

  getByUserId(
    userId: number
  ): ClientConnection | undefined {
    return this.userConnections.get(userId);
  }

  getAll(): ClientConnection[] {
    return [...this.connections];
  }

  getAuthenticated(): ClientConnection[] {
    return [...this.userConnections.values()];
  }

  broadcast(
    message: unknown,
    exclude?: ClientConnection
  ): void {
    for (const connection of this.userConnections.values()) {
      if (connection === exclude) {
        continue;
      }

      connection.send(message);
    }
  }

  count(): number {
    return this.connections.size;
  }
}