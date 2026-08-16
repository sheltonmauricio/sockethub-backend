import { MessageType } from "../protocol/message-types.js";
import type {
  LoginRequest,
  ProtocolMessage
} from "../protocol/messages.js";
import { AuthService } from "../services/auth-service.js";
import { UserRepository } from "../repositories/user-repository.js";

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

  constructor(
    private readonly client: ClientContext
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
        this.handleLogout();
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
      this.client.send({
        type: MessageType.LOGIN_RESPONSE,
        requestId: message.requestId,
        success: false,
        error: {
          code: "ALREADY_AUTHENTICATED",
          message:
            "O cliente já está autenticado."
        }
      });

      return;
    }

    const user =
      await this.authService.verifyCredentials(
        message.payload.username,
        message.payload.password
      );

    if (!user) {
      this.client.send({
        type: MessageType.LOGIN_RESPONSE,
        requestId: message.requestId,
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message:
            "Username ou password inválidos."
        }
      });

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

      this.client.send({
        type: MessageType.LOGIN_RESPONSE,
        requestId: message.requestId,
        success: false,
        error: {
          code: "USER_ALREADY_CONNECTED",
          message:
            "Este usuário já possui uma conexão ativa."
        }
      });

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

  private handleLogout(): void {
    if (!this.client.getUser()) {
      return;
    }

    this.client.unregisterAuthenticatedUser();
    this.client.setUser(null);

    console.log("Usuário terminou a sessão.");
  }

  private handlePing(): void {
    this.client.send({
      type: MessageType.PONG
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