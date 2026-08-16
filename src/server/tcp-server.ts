import net from "node:net";

import { ClientConnection } from "./client-connection.js";

const HOST = "0.0.0.0";
const PORT = 5000;

const clients = new Set<ClientConnection>();

const server = net.createServer((socket) => {
  const client = new ClientConnection(socket);

  clients.add(client);

  console.log(
    `Cliente conectado: ${socket.remoteAddress}:${socket.remotePort}`
  );

  socket.on("close", () => {
    clients.delete(client);

    console.log(`Clientes conectados: ${clients.size}`);
  });

  console.log(`Clientes conectados: ${clients.size}`);
});

server.listen(PORT, HOST, () => {
  console.log(`TCP Server iniciado em ${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error("Erro no servidor:", error);
});