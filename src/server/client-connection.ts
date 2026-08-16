import type { Socket } from "node:net";

import { MessageParser } from "../protocol/parser.js";
import { ProtocolError } from "../protocol/protocol-error.js";
import { serializeMessage } from "../protocol/serializer.js";
import { validateMessage } from "../protocol/validator.js";
import { MessageType } from "../protocol/message-types.js";
import { MessageDispatcher } from "./message-dispatcher.js";

export class ClientConnection {
  private readonly parser = new MessageParser();
  private readonly dispatcher = new MessageDispatcher();

  constructor(
    private readonly socket: Socket
  ) {
    this.setupSocket();
  }

  private setupSocket(): void {
    this.socket.on("data", (data: Buffer) => {
      this.handleData(data);
    });

    this.socket.on("close", () => {
      console.log("Cliente desconectado.");
    });

    this.socket.on("error", (error) => {
      console.error("Erro no socket:", error.message);
    });
  }

  private handleData(data: Buffer): void {
    try {
      const messages = this.parser.feed(data);

      for (const message of messages) {
        try {
          const validatedMessage = validateMessage(message);

          this.dispatcher.dispatch(validatedMessage);
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
      this.socket.write(serializeMessage(message));
    }
  }

  disconnect(): void {
    this.socket.end();
  }
}