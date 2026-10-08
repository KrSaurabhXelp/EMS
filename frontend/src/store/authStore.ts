import { create } from "zustand";

export type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

type AuthStore = {
  isLoggedIn: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user?: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
};

const decodeJwtPayload = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getInitialAuthState = (): {
  isLoggedIn: boolean;
  token: string | null;
  user: AuthUser | null;
} => {
  const token = localStorage.getItem("token");
  const storedLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isLoggedIn = storedLoggedIn || Boolean(token);

  let user: AuthUser | null = null;

  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      user = JSON.parse(rawUser);
    }
  } catch {
    user = null;
  }

  if (!user && token) {
    const payload = decodeJwtPayload(token);
    if (payload) {
      user = {
        id: payload.id,
        name: payload.name || payload.email?.split("@")[0] || "Admin",
        email: payload.email,
        role: payload.role,
      };
    }
  }

  if (isLoggedIn && !user) {
    user = { name: "Admin" };
  }

  return {
    isLoggedIn,
    token,
    user,
  };
};

const initialState = getInitialAuthState();

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: initialState.isLoggedIn,
  token: initialState.token,
  user: initialState.user,

  login: (token: string, user?: AuthUser) => {
    let resolvedUser = user;
    if (!resolvedUser && token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        resolvedUser = {
          id: payload.id,
          name: payload.name || payload.email?.split("@")[0] || "Admin",
          email: payload.email,
          role: payload.role,
        };
      }
    }
    if (!resolvedUser) {
      resolvedUser = { name: "Admin" };
    }

    localStorage.setItem("token", token);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("user", JSON.stringify(resolvedUser));

    set({
      isLoggedIn: true,
      token,
      user: resolvedUser,
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");

    set({
      isLoggedIn: false,
      token: null,
      user: null,
    });
  },

  setUser: (user: AuthUser) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));
