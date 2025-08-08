// app/lib/auth.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = { id: string; email: string; name?: string } | null;

type AuthContextValue = {
  user: User;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 토큰 복원
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("auth_token");
        if (saved) {
          setToken(saved);
          // TODO: 실제 /me 호출해서 사용자 정보 가져오기
          setUser({ id: "1", email: "restored@example.com" });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // TODO: 실제 로그인 API로 교체
  const login = async (email: string, _password: string) => {
    const fakeToken = "demo-token";
    await AsyncStorage.setItem("auth_token", fakeToken);
    setToken(fakeToken);
    setUser({ id: "1", email });
    return true;
  };

  const logout = async () => {
    await AsyncStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
