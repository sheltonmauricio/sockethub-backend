import { UserRepository } from "../src/repositories/user-repository.js";

const repository = new UserRepository();

const username = "testuser";

let user = repository.findByUsername(username);

if (!user) {
  user = repository.create(
    username,
    "temporary-password-hash"
  );
}

console.log("Usuário:", user);

console.log(
  "Por username:",
  repository.findByUsername(username)
);

console.log(
  "Por ID:",
  repository.findById(user.id)
);