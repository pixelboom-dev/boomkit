import { customers } from "./fixtures/customers";
import { users } from "./fixtures/users";

export type Customer = {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export const db = {
  customers: [...customers],
  users: [...users],
};
