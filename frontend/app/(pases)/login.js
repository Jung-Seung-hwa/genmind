import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  Image,
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
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState(""); // UI 미리보기용
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ---- BASE_URL 자동 감지 ----
  const deriveLanBase = () => {
    const sources = [
      Constants?.expoConfig?.hostUri,
      Constants?.expoGoConfig?.hostUri,
      Constants?.manifest?.debuggerHost, // 구버전 호환
    ].filter(Boolean);

    for (const s of sources) {
      const host = String(s).split(":")[0]; // "192.168.x.x"
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
      : "http://localhost:8000"); // fallback 제거

  const LOGIN_URL = `${BASE_URL}/auth/login`;

  const fetchWithTimeout = (url, opts = {}, timeoutMs = 8000) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() =>
      clearTimeout(id)
    );
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.message ||
          (res.status === 401
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : `HTTP ${res.status}`);
        Alert.alert("로그인 실패", String(msg));
        return;
      }

      // ✅ 로그인 성공 시 토큰 + 유저정보 저장
      await AsyncStorage.setItem("access_token", data.access_token);
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          email: data.email,
          name: data.name,
          user_type: data.user_type,
          comp_domain: data.comp_domain,
        })
      );

      // --- 관리자 여부 확인 ---
      const userType = String(
        data?.user_type || data?.role || ""
      ).toLowerCase();
      const tenantFromServer = data?.comp_domain || "";
      const tenantFromEmail = String(email.split("@")[1] || "").trim();
      const tenant = (
        tenantFromServer ||
        tenantFromEmail ||
        domain ||
        ""
      ).trim();

      if (userType === "admin") {
        if (Platform.OS === "web") {
          router.replace("/adminDashboard");
          return;
        }
        Alert.alert(
          "안내",
          "관리자 대시보드는 웹에서 이용해주세요.\n(PC 브라우저에서 로그인 시 바로 열립니다.)"
        );
        router.replace("/home");
        return;
      }

      // 일반 사용자 경로
      router.replace("/home");
    } catch (e) {
      console.error("login error:", e);
      Alert.alert(
        "네트워크 오류",
        e.name === "AbortError"
          ? "요청이 시간초과되었습니다."
          : "서버에 연결할 수 없습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupPress = () => router.replace("/join");
  const handleChangeDomain = () => router.replace("/domain");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* 로고/타이틀 */}
        <View style={styles.logoWrap}>
          <Image
            source={require("../../app/images/Chat.png")}
            style={{
              width: 120,
              height: 120,
              marginBottom: 14,
              resizeMode: "contain",
            }}
          />
          <Text style={styles.appTitle}>Genmind Chatbot</Text>
          <Text style={styles.appSubtitle}>중소기업 맞춤 자동응답 서비스</Text>
          <Text style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
            {BASE_URL}
          </Text>
        </View>

        {/* 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>로그인</Text>

          <View style={styles.field}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                const d = String(v.split("@")[1] || "").trim();
                if (d) setDomain(d);
              }}
              placeholder="example@company.com"
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

          <TouchableOpacity style={styles.outlineBtn} onPress={handleSignupPress}>
            <Text style={styles.outlineBtnText}>회원가입</Text>
          </TouchableOpacity>

          <View style={styles.linksWrap}>
            <Text style={styles.linksDivider}>또는</Text>
            <TouchableOpacity onPress={handleChangeDomain}>
              <Text style={styles.link}>다른 도메인으로 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace("/forgot")}
            >
              <Text style={styles.link}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9", padding: 20, justifyContent: "center" },
  logoWrap: { alignItems: "center", marginBottom: 32 },
  appTitle: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
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
  domainRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  domainDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981", marginRight: 6 },
  domainText: { fontSize: 13, color: "#334155" },
  field: { marginTop: 12 },
  label: { fontSize: 13, color: "#334155", marginBottom: 6 },
  input: { height: 48, backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#0f172a" },
  primaryBtn: { marginTop: 20, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#2563eb" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  outlineBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  outlineBtnText: { color: "#334155", fontSize: 15, fontWeight: "600" },
  linksWrap: { alignItems: "center", marginTop: 18 },
  linksDivider: { fontSize: 12, color: "#94a3b8", marginBottom: 8 },
  link: { fontSize: 13, color: "#2563eb", marginTop: 6 },
});
