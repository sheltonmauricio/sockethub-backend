import { createConnection, type Socket } from "node:net";
import { createInterface } from "node:readline";

const HOST = "localhost";
const PORT = 5000;

const socket: Socket = createConnection(
  {
    host: HOST,
    port: PORT
  },
  () => {
    console.log(`Conectado ao servidor ${HOST}:${PORT}`);
    console.log("Digite uma mensagem JSON e pressione ENTER.");
    rl.prompt();
  }
);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> "
});

socket.on("data", (data: Buffer) => {
  process.stdout.write(
    `\nServidor: ${data.toString("utf-8")}`
  );

  rl.prompt();
});

socket.on("close", () => {
  console.log("\nConexão encerrada.");
  rl.close();
});

socket.on("error", (error) => {
  console.error("\nErro:", error.message);
  rl.close();
});

rl.on("line", (input: string) => {
  const message = input.trim();

  if (!message) {
    rl.prompt();
    return;
  }

  socket.write(`${message}\n`);
  rl.prompt();
});