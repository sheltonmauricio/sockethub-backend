import {
  MessageRepository,
  type Message
} from "../repositories/message-repository.js";

import { GroupRepository } from "../repositories/group-repository.js";

export interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
}

export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly groupRepository: GroupRepository
  ) {}

  sendMessage(
    groupId: number,
    userId: number,
    content: string
  ): Message {
    const normalizedContent =
      content.trim();

    if (!normalizedContent) {
      throw new Error(
        "A mensagem não pode estar vazia."
      );
    }

    if (normalizedContent.length > 1000) {
      throw new Error(
        "A mensagem não pode exceder 1000 caracteres."
      );
    }

    const group =
      this.groupRepository.findById(
        groupId
      );

    if (!group) {
      throw new Error(
        "Grupo não encontrado."
      );
    }

    const isMember =
      this.groupRepository.isMember(
        groupId,
        userId
      );

    if (!isMember) {
      throw new Error(
        "O usuário não pertence ao grupo."
      );
    }

    return this.messageRepository.create(
      groupId,
      userId,
      normalizedContent
    );
  }

  getMessages(
    groupId: number,
    userId: number,
    limit: number,
    offset: number
  ): PaginatedMessages {
    const group =
      this.groupRepository.findById(
        groupId
      );

    if (!group) {
      throw new Error(
        "Grupo não encontrado."
      );
    }

    const isMember =
      this.groupRepository.isMember(
        groupId,
        userId
      );

    if (!isMember) {
      throw new Error(
        "O usuário não pertence ao grupo."
      );
    }

    const messages =
      this.messageRepository.findByGroup(
        groupId,
        limit + 1,
        offset
      );

    const hasMore =
      messages.length > limit;

    return {
      messages: hasMore
        ? messages.slice(0, limit)
        : messages,
      hasMore
    };
  }
}