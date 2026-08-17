import { GroupRepository } from "../src/repositories/group-repository.js";
import { GroupService } from "../src/services/group-service.js";

const repository = new GroupRepository();
const service = new GroupService(repository);

const group = repository.findByName(
  "Engenharia de Software"
);

if (!group) {
  throw new Error("Grupo não encontrado.");
}

console.log("Grupo:");
console.log(group);

console.log("\nMembros antes:");
console.log(
  service.getMembers(group.id)
);

const user2Id = 3;

if (!service.isMember(group.id, user2Id)) {
  service.joinGroup(
    group.id,
    user2Id
  );
}

console.log("\nMembros após entrada do user2:");
console.log(
  service.getMembers(group.id)
);