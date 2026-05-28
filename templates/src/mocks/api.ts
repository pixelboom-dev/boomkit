import { db, type Customer } from "./db";

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 400);
const ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE ?? 0);

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < ERROR_RATE) reject(new Error("Mock failure"));
      else resolve(value);
    }, LATENCY);
  });
}

export type CustomerInput = Pick<Customer, "name" | "status">;

export const api = {
  listCustomers: () => wait([...db.customers]),

  getCustomer: async (id: string) => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) throw new Error("Customer not found");
    return wait({ ...c });
  },

  createCustomer: async (input: CustomerInput) => {
    const created: Customer = {
      id: crypto.randomUUID(),
      name: input.name,
      status: input.status,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.customers.unshift(created);
    return wait(created);
  },

  updateCustomer: async (id: string, input: CustomerInput) => {
    const idx = db.customers.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error("Customer not found");
    db.customers[idx] = { ...db.customers[idx], ...input };
    return wait({ ...db.customers[idx] });
  },

  deleteCustomer: async (id: string) => {
    const idx = db.customers.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error("Customer not found");
    db.customers.splice(idx, 1);
    return wait({ id });
  },
};
