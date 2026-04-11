import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";

export type Role = "admin" | "editor" | "";

type AuthContextValue = {
  user: User | null;
  role: Role;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const result = await u.getIdTokenResult();
          setRole((result.claims.role as Role) ?? "");
        } catch {
          setRole("");
        }
      } else {
        setRole("");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      isAdmin: role === "admin",
      isEditor: role === "editor",
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        try {
          const result = await signInWithPopup(auth, provider);
          const info = getAdditionalUserInfo(result);

          if (info?.isNewUser) {
            await result.user.delete();
            return {
              error: "Accesso non autorizzato. Solo utenti già registrati possono accedere.",
            };
          }

          const tokenResult = await result.user.getIdTokenResult();
          setRole((tokenResult.claims.role as Role) ?? "");
          return {};
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Errore durante il login";
          return { error: msg };
        }
      },
      logout: async () => {
        await signOut(auth);
        setRole("");
      },
    }),
    [user, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
