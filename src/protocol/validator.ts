import { z } from "zod";

import { MessageType } from "./message-types.js";
import type { ProtocolMessage } from "./messages.js";
import { ProtocolError } from "./protocol-error.js";

const requestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(MessageType.REGISTER),
    requestId: z.string().min(1),
    payload: z.object({
      username: z.string().min(3).max(30),
      password: z.string().min(6)
    })
  }),
  
  z.object({
    type: z.literal(MessageType.LOGIN),
    requestId: z.string().min(1),
    payload: z.object({
      username: z.string().min(3).max(30),
      password: z.string().min(1)
    })
  }),

  z.object({
    type: z.literal(MessageType.LOGOUT),
    requestId: z.string().min(1),
    payload: z.object({})
  }),

  z.object({
    type: z.literal(MessageType.GET_GROUPS),
    requestId: z.string().min(1),
    payload: z.object({})
  }),

  z.object({
    type: z.literal(
      MessageType.GET_GROUP_MEMBERS
    ),
    requestId: z.string().min(1),
    payload: z.object({
      groupId: z.number().int().positive()
    })
  }),

  z.object({
    type: z.literal(MessageType.CREATE_GROUP),
    requestId: z.string().min(1),
    payload: z.object({
      name: z.string().min(3).max(50)
    })
  }),

  z.object({
    type: z.literal(MessageType.DELETE_GROUP),
    requestId: z.string().min(1),
    payload: z.object({
      groupId: z.number().int().positive()
    })
  }),

  z.object({
    type: z.literal(MessageType.JOIN_GROUP),
    requestId: z.string().min(1),
    payload: z.object({
      groupId: z.number().int().positive()
    })
  }),

  z.object({
    type: z.literal(MessageType.LEAVE_GROUP),
    requestId: z.string().min(1),
    payload: z.object({
      groupId: z.number().int().positive()
    })
  }),

  z.object({
    type: z.literal(MessageType.REMOVE_MEMBER),
    requestId: z.string().min(1),
    payload: z.object({
      groupId: z.number().int().positive(),
      userId: z.number().int().positive()
    })
  }),

  z.object({
    type: z.literal(MessageType.GET_MESSAGES),
    requestId: z.string().min(1),
    payload: z.object({
      groupId: z.number().int().positive(),
      limit: z.number().int().positive().max(50),
      offset: z.number().int().nonnegative()
    })
  }),

  z.object({
    type: z.literal(MessageType.SEND_MESSAGE),
    requestId: z.string().min(1),
    payload: z.object({
      groupId: z.number().int().positive(),
      content: z.string().min(1).max(1000)
    })
  }),

  z.object({
    type: z.literal(MessageType.PING)
  }),

  z.object({
    type: z.literal(MessageType.PONG)
  })
]);

export function validateMessage(message: unknown): ProtocolMessage {
  const result = requestSchema.safeParse(message);

  if (!result.success) {
    throw new ProtocolError(
      "INVALID_REQUEST",
      "A mensagem recebida não respeita o protocolo."
    );
  }

  return result.data as ProtocolMessage;
}