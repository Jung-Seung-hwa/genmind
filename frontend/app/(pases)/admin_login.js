// app/(page)/admin_login.js
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "react-native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Constants from "expo-constants";

export default function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const deriveLanBase = () => {
    const sources = [
      Constants?.expoConfig?.hostUri,
      Constants?.expoGoConfig?.hostUri,
      Constants?.manifest?.debuggerHost,
    ].filter(Boolean);

    for (const s of sources) {
      const host = String(s).split(":")[0];
      const isPrivateIPv4 =
        /^(10\.\d+\.\d+\.\d+)$/.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host) ||
        /^192\.168\.\d+\.\d+$/.test(host);
      if (isPrivateIPv4) return `http://${host}:8000`;
    }
    return null;
  };

  const AUTO_LAN_URL = deriveLanBase();
  const BASE_URL =
    AUTO_LAN_URL ||
    (Platform.OS === "android"
      ? "http://10.0.2.2:8000"
      : Platform.OS === "ios"
      ? "http://127.0.0.1:8000"
      : "http://localhost:8000");

  const LOGIN_URL = `${BASE_URL}/auth/admin_login`;

  const fetchWithTimeout = (url, opts = {}, timeoutMs = 8000) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
  };

  const handleLoginPress = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("오류", "이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetchWithTimeout(
        LOGIN_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
        10000
      );

      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch (_) {}

      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.message ||
          (res.status === 401
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : `HTTP ${res.status}`);
        return Alert.alert("로그인 실패", String(msg));
      }

      router.replace("/admin/home");
    } catch (e) {
      console.error("login error:", e);
      Alert.alert(
        "네트워크 오류",
        e.name === "AbortError" ? "요청이 시간초과되었습니다." : "서버에 연결할 수 없습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <Image
            source={require("../../app/images/Chat.png")}
            style={{ width: 120, height: 120, marginBottom: 14, resizeMode: "contain" }}
          />
          <Text style={styles.appTitle}>Genmind 관리자</Text>
          <Text style={styles.appSubtitle}>관리자 전용 로그인 페이지</Text>
          <Text style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>{BASE_URL}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>관리자 로그인</Text>

          <View style={styles.field}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@genmind.co.kr"
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLoginPress}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleLoginPress}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20, justifyContent: "center" },
  logoWrap: { alignItems: "center", marginBottom: 32 },
  appTitle: { fontSize: 24, fontWeight: "700", color: "#1e293b" },
  appSubtitle: { fontSize: 13, color: "#475569", marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", textAlign: "center", marginBottom: 8 },

  field: { marginTop: 12 },
  label: { fontSize: 13, color: "#334155", marginBottom: 6 },
  input: {
    height: 48,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
  },

  primaryBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
