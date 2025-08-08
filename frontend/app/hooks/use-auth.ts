import { useState } from "react";


export function useAuth() {
  const [user, setUser] = useState<any>(null);

  async function login(email: string, password: string): Promise<boolean> {
    // TODO: 실제 API 호출로 교체
    if (email === "test@example.com" && password === "1234") {
      setUser({ email });
      return true;
    }
    return false;
  }

  function logout() {
    setUser(null);
  }

  return { user, login, logout };
}
