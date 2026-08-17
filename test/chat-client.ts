import {
  createConnection,
  type Socket
} from "node:net";

import {
  createInterface
} from "node:readline";

import { randomUUID } from "node:crypto";

import { MessageParser } from "../src/protocol/parser.js";
import { serializeMessage } from "../src/protocol/serializer.js";
import { MessageType } from "../src/protocol/message-types.js";

const HOST = "localhost";
const PORT = 5000;

const HEARTBEAT_INTERVAL = 10_000;
const HEARTBEAT_TIMEOUT = 5_000;
const RECONNECT_DELAY = 3_000;

let socket: Socket | null = null;
let parser: MessageParser;

let heartbeatInterval: NodeJS.Timeout | null = null;
let heartbeatTimeout: NodeJS.Timeout | null = null;

let reconnectTimeout: NodeJS.Timeout | null = null;

let lastPongAt = Date.now();

let intentionalDisconnect = false;
let reconnecting = false;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> "
});

connect();

function connect(): void {
  if (socket && !socket.destroyed) {
    return;
  }

  parser = new MessageParser();

  console.log(
    `\nConectando ao servidor ${HOST}:${PORT}...`
  );

  socket = createConnection(
    {
      host: HOST,
      port: PORT
    },
    () => {
      reconnecting = false;
      lastPongAt = Date.now();

      console.log(
        `Conectado ao servidor ${HOST}:${PORT}`
      );

      startHeartbeat();

      printHelp();

      rl.prompt();
    }
  );

  setupSocket();
}

function setupSocket(): void {
  if (!socket) {
    return;
  }

  socket.on("data", (data: Buffer) => {
    try {
      const messages = parser.feed(data);

      for (const message of messages) {
        if (
          message.type === MessageType.PONG
        ) {
          lastPongAt = Date.now();

          if (heartbeatTimeout) {
            clearTimeout(heartbeatTimeout);
            heartbeatTimeout = null;
          }

          continue;
        }

        if (
          message.type === MessageType.PING
        ) {
          send({
            type: MessageType.PONG
          });

          continue;
        }

        console.log(
          "\nServidor:",
          JSON.stringify(
            message,
            null,
            2
          )
        );
      }

      rl.prompt();
    } catch (error) {
      console.error(
        "\nErro ao processar resposta:",
        error
      );

      rl.prompt();
    }
  });

  socket.on("close", () => {
    stopHeartbeat();

    socket = null;

    console.log(
      "\nConexão encerrada."
    );

    if (!intentionalDisconnect) {
      scheduleReconnect();
    } else {
      rl.close();
    }
  });

  socket.on("error", (error) => {
    console.error(
      "\nErro no socket:",
      error.message
    );
  });
}

function scheduleReconnect(): void {
  if (
    intentionalDisconnect ||
    reconnecting ||
    reconnectTimeout
  ) {
    return;
  }

  reconnecting = true;

  console.log(
    `Tentando reconectar em ${RECONNECT_DELAY / 1000} segundos...`
  );

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    reconnecting = false;

    connect();
  }, RECONNECT_DELAY);
}

function startHeartbeat(): void {
  stopHeartbeat();

  lastPongAt = Date.now();

  heartbeatInterval = setInterval(() => {
    if (!socket || socket.destroyed) {
      return;
    }

    send({
      type: MessageType.PING
    });

    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout);
    }

    heartbeatTimeout = setTimeout(() => {
      const elapsed =
        Date.now() - lastPongAt;

      if (
        elapsed >=
        HEARTBEAT_INTERVAL +
          HEARTBEAT_TIMEOUT
      ) {
        console.error(
          "\nServidor não respondeu ao heartbeat."
        );

        socket?.destroy();
      }
    }, HEARTBEAT_TIMEOUT);
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(
      heartbeatInterval
    );

    heartbeatInterval = null;
  }

  if (heartbeatTimeout) {
    clearTimeout(
      heartbeatTimeout
    );

    heartbeatTimeout = null;
  }
}

function handleCommand(
  input: string
): void {
  if (!input) {
    rl.prompt();
    return;
  }

  const parts = input.split(" ");
  const command =
    parts[0].toLowerCase();

  switch (command) {
    case "login":
      handleLogin(parts);
      break;

    case "groups":
      handleGetGroups();
      break;

    case "create":
      handleCreateGroup(
        parts.slice(1).join(" ")
      );
      break;

    case "join":
      handleJoinGroup(parts);
      break;

    case "leave":
      handleLeaveGroup(parts);
      break;

    case "send":
      handleSendMessage(parts);
      break;

    case "messages":
      handleGetMessages(parts);
      break;

    case "logout":
      handleLogout();
      break;

    case "ping":
      handlePing();
      break;

    case "help":
      printHelp();
      break;

    case "exit":
      disconnect();
      return;

    default:
      console.log(
        `Comando desconhecido: ${command}`
      );

      printHelp();
  }

  rl.prompt();
}

function disconnect(): void {
  intentionalDisconnect = true;

  stopHeartbeat();

  if (reconnectTimeout) {
    clearTimeout(
      reconnectTimeout
    );

    reconnectTimeout = null;
  }

  if (socket) {
    socket.end();
    socket = null;
  } else {
    rl.close();
  }
}

function send(
  message: unknown
): void {
  if (!socket || socket.destroyed) {
    console.log(
      "O socket está fechado."
    );

    return;
  }

  socket.write(
    serializeMessage(message)
  );
}

function handleLogin(
  parts: string[]
): void {
  const username = parts[1];
  const password = parts[2];

  if (!username || !password) {
    console.log(
      "Uso: login <username> <password>"
    );

    return;
  }

  send({
    type: MessageType.LOGIN,
    requestId: randomUUID(),
    payload: {
      username,
      password
    }
  });
}

function handleGetGroups(): void {
  send({
    type: MessageType.GET_GROUPS,
    requestId: randomUUID(),
    payload: {}
  });
}

function handleCreateGroup(
  name: string
): void {
  if (!name) {
    console.log(
      "Uso: create <nome do grupo>"
    );

    return;
  }

  send({
    type: MessageType.CREATE_GROUP,
    requestId: randomUUID(),
    payload: {
      name
    }
  });
}

function handleJoinGroup(
  parts: string[]
): void {
  const groupId = Number(parts[1]);

  if (!Number.isInteger(groupId)) {
    console.log(
      "Uso: join <groupId>"
    );

    return;
  }

  send({
    type: MessageType.JOIN_GROUP,
    requestId: randomUUID(),
    payload: {
      groupId
    }
  });
}

function handleLeaveGroup(
  parts: string[]
): void {
  const groupId = Number(parts[1]);

  if (!Number.isInteger(groupId)) {
    console.log(
      "Uso: leave <groupId>"
    );

    return;
  }

  send({
    type: MessageType.LEAVE_GROUP,
    requestId: randomUUID(),
    payload: {
      groupId
    }
  });
}

function handleSendMessage(
  parts: string[]
): void {
  const groupId = Number(parts[1]);

  const content = parts
    .slice(2)
    .join(" ");

  if (
    !Number.isInteger(groupId) ||
    !content
  ) {
    console.log(
      "Uso: send <groupId> <mensagem>"
    );

    return;
  }

  send({
    type: MessageType.SEND_MESSAGE,
    requestId: randomUUID(),
    payload: {
      groupId,
      content
    }
  });
}

function handleGetMessages(
  parts: string[]
): void {
  const groupId = Number(parts[1]);

  if (!Number.isInteger(groupId)) {
    console.log(
      "Uso: messages <groupId>"
    );

    return;
  }

  send({
    type: MessageType.GET_MESSAGES,
    requestId: randomUUID(),
    payload: {
      groupId,
      limit: 20,
      offset: 0
    }
  });
}

function handleLogout(): void {
  send({
    type: MessageType.LOGOUT,
    requestId: randomUUID(),
    payload: {}
  });
}

function handlePing(): void {
  send({
    type: MessageType.PING
  });
}

function printHelp(): void {
  console.log(`
Comandos disponíveis:

  login <username> <password>
  groups
  create <nome>
  join <groupId>
  leave <groupId>
  send <groupId> <mensagem>
  messages <groupId>
  logout
  ping
  help
  exit
`);
}

rl.on("line", (input: string) => {
  handleCommand(input.trim());
});