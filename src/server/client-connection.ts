import type { Socket } from "node:net";

import { MessageType } from "../protocol/message-types.js";
import { MessageParser } from "../protocol/parser.js";
import { ProtocolError } from "../protocol/protocol-error.js";
import { serializeMessage } from "../protocol/serializer.js";
import { validateMessage } from "../protocol/validator.js";
import { ConnectionManager } from "./connection-manager.js";
import { MessageDispatcher } from "./message-dispatcher.js";

interface AuthenticatedUser {
  id: number;
  username: string;
}

export class ClientConnection {
  private readonly parser = new MessageParser();

  private readonly dispatcher: MessageDispatcher;

  private authenticatedUser: AuthenticatedUser | null =
    null;

  constructor(
    private readonly socket: Socket,
    private readonly connectionManager: ConnectionManager
  ) {
    this.dispatcher = 
      new MessageDispatcher(
        this,
        this.connectionManager
      );

    this.setupSocket();
  }

  private setupSocket(): void {
    this.socket.on("data", (data: Buffer) => {
      void this.handleData(data);
    });

    this.socket.on("close", () => {
      console.log("Cliente desconectado.");

      this.connectionManager.remove(this);
    });

    this.socket.on("error", (error) => {
      console.error(
        "Erro no socket:",
        error.message
      );
    });
  }

  private async handleData(
    data: Buffer
  ): Promise<void> {
    try {
      const messages = this.parser.feed(data);

      for (const message of messages) {
        try {
          const validatedMessage =
            validateMessage(message);

          await this.dispatcher.dispatch(
            validatedMessage
          );
        } catch (error) {
          if (error instanceof ProtocolError) {
            const requestId =
              typeof message === "object" &&
              message !== null &&
              "requestId" in message &&
              typeof message.requestId === "string"
                ? message.requestId
                : undefined;

            this.sendError(error, requestId);
            continue;
          }

          throw error;
        }
      }
    } catch (error) {
      if (error instanceof ProtocolError) {
        this.sendError(error);
        return;
      }

      console.error("Erro interno:", error);

      this.socket.destroy();
    }
  }

  private sendError(
    error: ProtocolError,
    requestId?: string
  ): void {
    this.send({
      type: MessageType.ERROR,
      ...(requestId && { requestId }),
      payload: {
        code: error.code,
        message: error.message
      }
    });
  }

  send(message: unknown): void {
    if (!this.socket.destroyed) {
      this.socket.write(
        serializeMessage(message)
      );
    }
  }

  disconnect(): void {
    this.socket.end();
  }

  getUser(): AuthenticatedUser | null {
    return this.authenticatedUser;
  }

  setUser(
    user: AuthenticatedUser | null
  ): void {
    this.authenticatedUser = user;
  }

  registerAuthenticatedUser(): boolean {
    return this.connectionManager.registerUser(
      this
    );
  }

  unregisterAuthenticatedUser(): void {
    this.connectionManager.unregisterUser(
      this
    );
  }

  isAuthenticated(): boolean {
    return this.authenticatedUser !== null;
  }
}