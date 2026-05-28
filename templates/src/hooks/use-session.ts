import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi, type SessionUser } from "@/mocks/auth";

type SessionState = {
  user: SessionUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      signIn: async (email, password) => {
        const user = await authApi.signIn(email, password);
        set({ user });
      },
      signUp: async (name, email, password) => {
        const user = await authApi.signUp(name, email, password);
        set({ user });
      },
      signOut: () => set({ user: null }),
    }),
    {
      name: "prototype-session",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
