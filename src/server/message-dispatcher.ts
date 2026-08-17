import { MessageType } from "../protocol/message-types.js";

import type {
  CreateGroupRequest,
  GetGroupsRequest,
  GetMessagesRequest,
  GroupRequest,
  LoginRequest,
  MemberRequest,
  ProtocolMessage,
  ChatMessage,
  SendMessageRequest
} from "../protocol/messages.js";

import { AuthService } from "../services/auth-service.js";
import { GroupService } from "../services/group-service.js";
import { MessageService } from "../services/message-service.js";

import { UserRepository } from "../repositories/user-repository.js";
import { GroupRepository } from "../repositories/group-repository.js";
import { MessageRepository } from "../repositories/message-repository.js";
import { ConnectionManager } from "./connection-manager.js";

export interface ClientContext {
  getUser(): {
    id: number;
    username: string;
  } | null;

  setUser(
    user: {
      id: number;
      username: string;
    } | null
  ): void;

  registerAuthenticatedUser(): boolean;

  unregisterAuthenticatedUser(): void;

  send(message: unknown): void;
}

export class MessageDispatcher {
  private readonly userRepository =
    new UserRepository();

  private readonly authService =
    new AuthService(this.userRepository);

  private readonly groupRepository =
    new GroupRepository();

  private readonly groupService =
    new GroupService(this.groupRepository);

  private readonly messageRepository =
    new MessageRepository();

  private readonly messageService =
    new MessageService(
      this.messageRepository,
      this.groupRepository
    );

  constructor(
    private readonly client: ClientContext,
    private readonly connectionManager: ConnectionManager
  ) {}

  async dispatch(
    message: ProtocolMessage
  ): Promise<void> {
    switch (message.type) {
      case MessageType.LOGIN:
        await this.handleLogin(
          message as LoginRequest
        );
        break;

      case MessageType.LOGOUT:
        this.handleLogout(message);
        break;

      case MessageType.GET_GROUPS:
        this.handleGetGroups(
          message as GetGroupsRequest
        );
        break;

      case MessageType.CREATE_GROUP:
        this.handleCreateGroup(
          message as CreateGroupRequest
        );
        break;

      case MessageType.DELETE_GROUP:
        this.handleDeleteGroup(
          message as GroupRequest
        );
        break;

      case MessageType.JOIN_GROUP:
        this.handleJoinGroup(
          message as GroupRequest
        );
        break;

      case MessageType.LEAVE_GROUP:
        this.handleLeaveGroup(
          message as GroupRequest
        );
        break;

      case MessageType.ADD_MEMBER:
        this.handleAddMember(
          message as MemberRequest
        );
        break;

      case MessageType.REMOVE_MEMBER:
        this.handleRemoveMember(
          message as MemberRequest
        );
        break;

      case MessageType.GET_MESSAGES:
        this.handleGetMessages(
          message as GetMessagesRequest
        );
        break;

      case MessageType.SEND_MESSAGE:
        this.handleSendMessage(
          message as SendMessageRequest
        );
        break;

      case MessageType.PING:
        this.handlePing();
        break;

      default:
        this.handleNotImplemented(message.type);
    }
  }

  private async handleLogin(
    message: LoginRequest
  ): Promise<void> {
    if (this.client.getUser()) {
      this.sendError(
        MessageType.LOGIN_RESPONSE,
        message.requestId,
        "ALREADY_AUTHENTICATED",
        "O cliente já está autenticado."
      );

      return;
    }

    const user =
      await this.authService.verifyCredentials(
        message.payload.username,
        message.payload.password
      );

    if (!user) {
      this.sendError(
        MessageType.LOGIN_RESPONSE,
        message.requestId,
        "INVALID_CREDENTIALS",
        "Username ou password inválidos."
      );

      return;
    }

    const authenticatedUser = {
      id: user.id,
      username: user.username
    };

    this.client.setUser(authenticatedUser);

    const registered =
      this.client.registerAuthenticatedUser();

    if (!registered) {
      this.client.setUser(null);

      this.sendError(
        MessageType.LOGIN_RESPONSE,
        message.requestId,
        "USER_ALREADY_CONNECTED",
        "Este usuário já possui uma conexão ativa."
      );

      return;
    }

    this.client.send({
      type: MessageType.LOGIN_RESPONSE,
      requestId: message.requestId,
      success: true,
      payload: {
        user: authenticatedUser
      }
    });

    console.log(
      `Usuário autenticado: ${user.username}`
    );
  }

  private handleLogout(
    message: ProtocolMessage
  ): void {
    if (!this.client.getUser()) {
      this.sendError(
        MessageType.LOGOUT_RESPONSE,
        "requestId" in message
          ? message.requestId
          : undefined,
        "NOT_AUTHENTICATED",
        "O cliente não está autenticado."
      );

      return;
    }

    this.client.unregisterAuthenticatedUser();
    this.client.setUser(null);

    this.client.send({
      type: MessageType.LOGOUT_RESPONSE,
      requestId:
        "requestId" in message
          ? message.requestId
          : undefined,
      success: true
    });

    console.log(
      "Usuário terminou a sessão."
    );
  }

  private handleGetGroups(
    message: GetGroupsRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    const groups =
      this.groupService.getGroups();

    const summaries = groups.map((group) => ({
      id: group.id,
      name: group.name,
      role:
        group.ownerId === user.id
          ? "OWNER" as const
          : this.groupService.isMember(
              group.id,
              user.id
            )
            ? "MEMBER" as const
            : null
    }));

    this.client.send({
      type: MessageType.GET_GROUPS_RESPONSE,
      requestId: message.requestId,
      success: true,
      payload: {
        groups: summaries
      }
    });
  }

  private handleCreateGroup(
    message: CreateGroupRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      const group =
        this.groupService.createGroup(
          message.payload.name,
          user.id
        );

      this.client.send({
        type: MessageType.CREATE_GROUP_RESPONSE,
        requestId: message.requestId,
        success: true,
        payload: {
          group: {
            id: group.id,
            name: group.name,
            ownerId: group.ownerId
          }
        }
      });
    } catch (error) {
      this.sendServiceError(
        MessageType.CREATE_GROUP_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handleDeleteGroup(
    message: GroupRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      this.groupService.deleteGroup(
        message.payload.groupId,
        user.id
      );

      this.client.send({
        type: MessageType.DELETE_GROUP_RESPONSE,
        requestId: message.requestId,
        success: true
      });
    } catch (error) {
      this.sendServiceError(
        MessageType.DELETE_GROUP_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handleJoinGroup(
    message: GroupRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      const group =
        this.groupService.joinGroup(
          message.payload.groupId,
          user.id
        );

      this.client.send({
        type: MessageType.JOIN_GROUP_RESPONSE,
        requestId: message.requestId,
        success: true,
        payload: {
          group: {
            id: group.id,
            name: group.name,
            ownerId: group.ownerId
          }
        }
      });
    } catch (error) {
      this.sendServiceError(
        MessageType.JOIN_GROUP_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handleLeaveGroup(
    message: GroupRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      this.groupService.leaveGroup(
        message.payload.groupId,
        user.id
      );

      this.client.send({
        type: MessageType.LEAVE_GROUP_RESPONSE,
        requestId: message.requestId,
        success: true
      });
    } catch (error) {
      this.sendServiceError(
        MessageType.LEAVE_GROUP_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handleAddMember(
    message: MemberRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      this.groupService.addMember(
        message.payload.groupId,
        user.id,
        message.payload.userId
      );

      this.client.send({
        type: MessageType.ADD_MEMBER_RESPONSE,
        requestId: message.requestId,
        success: true
      });
    } catch (error) {
      this.sendServiceError(
        MessageType.ADD_MEMBER_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handleRemoveMember(
    message: MemberRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      this.groupService.removeMember(
        message.payload.groupId,
        user.id,
        message.payload.userId
      );

      this.client.send({
        type: MessageType.REMOVE_MEMBER_RESPONSE,
        requestId: message.requestId,
        success: true
      });
    } catch (error) {
      this.sendServiceError(
        MessageType.REMOVE_MEMBER_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handleGetMessages(
    message: GetMessagesRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      const messages =
        this.messageService.getMessages(
          message.payload.groupId,
          user.id,
          message.payload.limit,
          message.payload.offset
        );

      const chatMessages =
        messages.map((item) => ({
          id: item.id,
          groupId: item.groupId,
          sender: {
            id: item.userId,
            username: item.username
          },
          content: item.content,
          createdAt: item.createdAt
        }));

      this.client.send({
        type: MessageType.GET_MESSAGES_RESPONSE,
        requestId: message.requestId,
        success: true,
        payload: {
          messages: chatMessages,
          hasMore:
            messages.length ===
            message.payload.limit
        }
      });
    } catch (error) {
      this.sendServiceError(
        MessageType.GET_MESSAGES_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handleSendMessage(
    message: SendMessageRequest
  ): void {
    const user = this.requireAuthentication(
      message
    );

    if (!user) {
      return;
    }

    try {
      const created =
        this.messageService.sendMessage(
          message.payload.groupId,
          user.id,
          message.payload.content
        );

      this.client.send({
        type: MessageType.SEND_MESSAGE_RESPONSE,
        requestId: message.requestId,
        success: true,
        payload: {
          messageId: created.id
        }
      });

      const members =
        this.groupService.getMembers(
          message.payload.groupId
        );

      const newMessage: ChatMessage = {
        id: created.id,
        groupId: created.groupId,
        sender: {
          id: created.userId,
          username: created.username
        },
        content: created.content,
        createdAt: created.createdAt
      };

      const userIds = members.map(
        (member) => member.userId
      );

      this.connectionManager.broadcastToUsers(
        userIds,
        {
          type: MessageType.NEW_MESSAGE,
          payload: {
            message: newMessage
          }
        },
        this.client
      );
    } catch (error) {
      this.sendServiceError(
        MessageType.SEND_MESSAGE_RESPONSE,
        message.requestId,
        error
      );
    }
  }

  private handlePing(): void {
    this.client.send({
      type: MessageType.PONG
    });
  }

  private requireAuthentication(
    message: ProtocolMessage
  ): {
    id: number;
    username: string;
  } | null {
    const user = this.client.getUser();

    if (!user) {
      this.sendError(
        MessageType.ERROR,
        "requestId" in message
          ? message.requestId
          : undefined,
        "NOT_AUTHENTICATED",
        "É necessário estar autenticado para realizar esta operação."
      );

      return null;
    }

    return user;
  }

  private sendServiceError(
    type: MessageType,
    requestId: string,
    error: unknown
  ): void {
    const message =
      error instanceof Error
        ? error.message
        : "Ocorreu um erro ao processar a operação.";

    this.sendError(
      type,
      requestId,
      "OPERATION_FAILED",
      message
    );
  }

  private sendError(
    type: MessageType,
    requestId: string | undefined,
    code: string,
    message: string
  ): void {
    this.client.send({
      type,
      ...(requestId !== undefined && {
        requestId
      }),
      success: false,
      error: {
        code,
        message
      }
    });
  }

  private handleNotImplemented(
    type: MessageType
  ): void {
    this.client.send({
      type: MessageType.ERROR,
      payload: {
        code: "NOT_IMPLEMENTED",
        message:
          `A operação ${type} ainda não foi implementada.`
      }
    });
  }
}