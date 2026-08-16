import type { ProtocolMessage } from "./messages.js";
import { ProtocolError } from "./protocol-error.js";

export class MessageParser {
  private buffer = "";

  private static readonly MAX_MESSAGE_SIZE = 64 * 1024;

  feed(data: Buffer): ProtocolMessage[] {
    this.buffer += data.toString("utf-8");

    if (
      Buffer.byteLength(this.buffer, "utf-8") >
      MessageParser.MAX_MESSAGE_SIZE
    ) {
      throw new ProtocolError(
        "MESSAGE_TOO_LARGE",
        "A mensagem excedeu o tamanho máximo permitido."
      );
    }

    const messages: ProtocolMessage[] = [];

    let newlineIndex: number;

    while ((newlineIndex = this.buffer.indexOf("\n")) !== -1) {
      const rawMessage = this.buffer.slice(0, newlineIndex);

      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!rawMessage.trim()) {
        continue;
      }

      try {
        messages.push(JSON.parse(rawMessage) as ProtocolMessage);
      } catch {
        throw new ProtocolError(
          "INVALID_JSON",
          "A mensagem não contém um JSON válido."
        );
      }
    }

    return messages;
  }
}