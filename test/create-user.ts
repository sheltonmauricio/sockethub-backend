import { AuthService } from "../src/services/auth-service.js";
import { UserRepository } from "../src/repositories/user-repository.js";

const repository = new UserRepository();
const authService = new AuthService(repository);

const username = "user2";
const password = "user123";

const existingUser = repository.findByUsername(username);

if (existingUser) {
  console.log(`Usuário "${username}" já existe.`);
  process.exit(0);
}

const passwordHash = await authService.hashPassword(password);

const user = repository.create(
  username,
  passwordHash
);

console.log("Usuário criado:");
console.log({
  id: user.id,
  username: user.username
});