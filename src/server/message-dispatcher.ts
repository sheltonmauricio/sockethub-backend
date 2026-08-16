import { MessageType } from "../protocol/message-types.js";
import type { ProtocolMessage } from "../protocol/messages.js";

export class MessageDispatcher {
  dispatch(message: ProtocolMessage): void {
    switch (message.type) {
      case MessageType.LOGIN:
        console.log("LOGIN recebido:", message.payload);
        break;

      case MessageType.LOGOUT:
        console.log("LOGOUT recebido");
        break;

      case MessageType.GET_GROUPS:
        console.log("GET_GROUPS recebido");
        break;

      case MessageType.CREATE_GROUP:
        console.log("CREATE_GROUP recebido:", message.payload);
        break;

      case MessageType.JOIN_GROUP:
        console.log("JOIN_GROUP recebido:", message.payload);
        break;

      case MessageType.LEAVE_GROUP:
        console.log("LEAVE_GROUP recebido:", message.payload);
        break;

      case MessageType.ADD_MEMBER:
        console.log("ADD_MEMBER recebido:", message.payload);
        break;

      case MessageType.REMOVE_MEMBER:
        console.log("REMOVE_MEMBER recebido:", message.payload);
        break;

      case MessageType.GET_MESSAGES:
        console.log("GET_MESSAGES recebido:", message.payload);
        break;

      case MessageType.SEND_MESSAGE:
        console.log("SEND_MESSAGE recebido:", message.payload);
        break;

      case MessageType.PING:
        console.log("PING recebido");
        break;

      default:
        console.log("Mensagem não suportada:", message);
    }
  }
}