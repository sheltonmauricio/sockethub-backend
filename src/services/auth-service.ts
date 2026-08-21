import {
  randomBytes,
  scrypt,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

import {
  UserRepository,
  type UserRecord
} from "../repositories/user-repository.js";

const scryptAsync = promisify(scrypt);

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

  async register(
    username: string,
    password: string
  ): Promise<UserRecord> {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      throw new Error(
        "O username é obrigatório."
      );
    }

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > 30
    ) {
      throw new Error(
        "O username deve ter entre 3 e 30 caracteres."
      );
    }

    if (password.length < 6) {
      throw new Error(
        "A password deve ter pelo menos 6 caracteres."
      );
    }

    const existingUser =
      this.userRepository.findByUsername(
        normalizedUsername
      );

    if (existingUser) {
      throw new Error(
        "O username já está em uso."
      );
    }

    const passwordHash =
      await this.hashPassword(password);

    return this.userRepository.create(
      normalizedUsername,
      passwordHash
    );
  }

  async verifyCredentials(
    username: string,
    password: string
  ): Promise<UserRecord | null> {
    const user = this.userRepository.findByUsername(username);

    if (!user) {
      return null;
    }

    const valid = await this.verifyPassword(
      password,
      user.passwordHash
    );

    return valid ? user : null;
  }

  hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH).toString("hex");

    return new Promise((resolve, reject) => {
      scrypt(
        password,
        salt,
        KEY_LENGTH,
        (error, derivedKey) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(
            `${salt}:${derivedKey.toString("hex")}`
          );
        }
      );
    });
  }

  private async verifyPassword(
    password: string,
    storedHash: string
  ): Promise<boolean> {
    const [salt, hash] = storedHash.split(":");

    if (!salt || !hash) {
      return false;
    }

    const storedKey = Buffer.from(hash, "hex");

    const derivedKey = (await scryptAsync(
      password,
      salt,
      storedKey.length
    )) as Buffer;

    if (derivedKey.length !== storedKey.length) {
      return false;
    }

    return timingSafeEqual(
      derivedKey,
      storedKey
    );
  }
}