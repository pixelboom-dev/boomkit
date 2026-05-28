import { db, type User } from "./db";

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 400);

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

export type SessionUser = Omit<User, "password">;

export const authApi = {
  signIn: async (email: string, password: string): Promise<SessionUser> => {
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!user) {
      await wait(null);
      throw new Error("invalid_credentials");
    }
    const { password: _pw, ...rest } = user;
    return wait(rest);
  },

  signUp: async (
    name: string,
    email: string,
    password: string,
  ): Promise<SessionUser> => {
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      await wait(null);
      throw new Error("email_taken");
    }
    const created: User = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
    };
    db.users.push(created);
    const { password: _pw, ...rest } = created;
    return wait(rest);
  },
};
