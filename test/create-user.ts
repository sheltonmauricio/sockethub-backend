import { AuthService } from "../src/services/auth-service.js";
import { UserRepository } from "../src/repositories/user-repository.js";

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error(
    "Uso: npm run create-user -- <username> <password>"
  );

  process.exit(1);
}

const repository = new UserRepository();

const authService = new AuthService(
  repository
);

const existingUser =
  repository.findByUsername(username);

if (existingUser) {
  console.error(
    `Usuário "${username}" já existe.`
  );

  process.exit(1);
}

const passwordHash =
  await authService.hashPassword(password);

const user = repository.create(
  username,
  passwordHash
);

console.log("Usuário criado com sucesso:");
console.log({
  id: user.id,
  username: user.username
});