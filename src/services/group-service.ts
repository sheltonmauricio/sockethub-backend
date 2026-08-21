import {
  GroupRepository,
  type Group
} from "../repositories/group-repository.js";

export class GroupService {
  constructor(
    private readonly groupRepository: GroupRepository
  ) {}

  createGroup(
    name: string,
    ownerId: number
  ): Group {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error(
        "O nome do grupo é obrigatório."
      );
    }

    if (normalizedName.length > 100) {
      throw new Error(
        "O nome do grupo não pode exceder 100 caracteres."
      );
    }

    const existingGroup =
      this.groupRepository.findByName(
        normalizedName
      );

    if (existingGroup) {
      throw new Error(
        "Já existe um grupo com esse nome."
      );
    }

    const group =
      this.groupRepository.create(
        normalizedName,
        ownerId
      );

    this.groupRepository.addMember(
      group.id,
      ownerId
    );

    return group;
  }

  getGroup(
    groupId: number
  ): Group | undefined {
    return this.groupRepository.findById(
      groupId
    );
  }

  getGroups(): Group[] {
    return this.groupRepository.findAll();
  }

  joinGroup(
    groupId: number,
    userId: number
  ): Group {
    const group =
      this.groupRepository.findById(
        groupId
      );

    if (!group) {
      throw new Error(
        "Grupo não encontrado."
      );
    }

    if (
      this.groupRepository.isMember(
        groupId,
        userId
      )
    ) {
      throw new Error(
        "O usuário já pertence ao grupo."
      );
    }

    this.groupRepository.addMember(
      groupId,
      userId
    );

    return group;
  }

  leaveGroup(
    groupId: number,
    userId: number
  ): void {
    const group =
      this.groupRepository.findById(
        groupId
      );

    if (!group) {
      throw new Error(
        "Grupo não encontrado."
      );
    }

    if (group.ownerId === userId) {
      throw new Error(
        "O proprietário não pode sair do grupo."
      );
    }

    if (
      !this.groupRepository.isMember(
        groupId,
        userId
      )
    ) {
      throw new Error(
        "O usuário não pertence ao grupo."
      );
    }

    this.groupRepository.removeMember(
      groupId,
      userId
    );
  }

  removeMember(
    groupId: number,
    ownerId: number,
    userId: number
  ): void {
    const group =
      this.groupRepository.findById(
        groupId
      );

    if (!group) {
      throw new Error(
        "Grupo não encontrado."
      );
    }

    if (group.ownerId !== ownerId) {
      throw new Error(
        "Apenas o proprietário pode remover membros."
      );
    }

    if (userId === ownerId) {
      throw new Error(
        "O proprietário não pode remover a si próprio."
      );
    }

    if (
      !this.groupRepository.isMember(
        groupId,
        userId
      )
    ) {
      throw new Error(
        "O usuário não pertence ao grupo."
      );
    }

    this.groupRepository.removeMember(
      groupId,
      userId
    );
  }

  deleteGroup(
    groupId: number,
    ownerId: number
  ): void {
    const group =
      this.groupRepository.findById(
        groupId
      );

    if (!group) {
      throw new Error(
        "Grupo não encontrado."
      );
    }

    if (group.ownerId !== ownerId) {
      throw new Error(
        "Apenas o proprietário pode eliminar o grupo."
      );
    }

    this.groupRepository.delete(groupId);
  }

  isMember(
    groupId: number,
    userId: number
  ): boolean {
    return this.groupRepository.isMember(
      groupId,
      userId
    );
  }

  getMembers(
    groupId: number
  ) {
    return this.groupRepository.getMembers(
      groupId
    );
  }
}