import { TcpServer } from "./server/tcp-server.js";

const PORT = 5000;

const server = new TcpServer(PORT);

server.start();