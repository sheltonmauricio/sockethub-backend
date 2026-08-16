import {
  createServer,
  type Server,
  type Socket
} from "node:net";

import { ClientConnection } from "./client-connection.js";
import { ConnectionManager } from "./connection-manager.js";

export class TcpServer {
  private readonly server: Server;

  private readonly connectionManager =
    new ConnectionManager();

  constructor(
    private readonly port: number
  ) {
    this.server = createServer((socket) => {
      this.handleConnection(socket);
    });
  }

  start(): void {
    this.server.listen(
      this.port,
      () => {
        console.log(
          `Servidor TCP iniciado na porta ${this.port}.`
        );
      }
    );

    this.server.on("error", (error) => {
      console.error(
        "Erro no servidor:",
        error.message
      );
    });
  }

  stop(): void {
    this.server.close(() => {
      console.log(
        "Servidor TCP encerrado."
      );
    });
  }

  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  private handleConnection(
    socket: Socket
  ): void {
    const connection = new ClientConnection(
      socket,
      this.connectionManager
    );

    this.connectionManager.add(connection);

    console.log(
      `Novo cliente conectado: ${socket.remoteAddress}:${socket.remotePort}`
    );
  }
}