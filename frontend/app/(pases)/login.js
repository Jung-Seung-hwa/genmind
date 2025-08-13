import React, { useState } from "react";
import { useRouter } from "expo-router";
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

// 디자인 전용: 라우팅/스토리지/인증 로직 제거한 순수 UI 버전
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState(""); // 디자인 미리보기용 표시
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLoginPress = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("오류", "이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace("/home");
    }, 800);
  };

  const handleSignupPress = () => Alert.alert("회원가입", "MVP: 추후 연결 예정");
  const handleChangeDomain = () => {
    router.replace("/domain");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* 로고/타이틀 */}
        <View style={styles.logoWrap}>
          <View style={styles.logoOuter}>
            <View style={styles.logoMid}>
              <View style={styles.logoInner}>
                <View style={styles.dotLg} />
                <View style={styles.dotMd} />
                <View style={styles.dotSm} />
              </View>
            </View>
          </View>
          <Text style={styles.appTitle}>Genmind Chatbot</Text>
          <Text style={styles.appSubtitle}>중소기업 맞춤 자동응답 서비스</Text>
        </View>

        {/* 카드 */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>로그인</Text>
          {/* 도메인 입력값 항상 표시 */}
          <View style={styles.domainRow}>
            <View style={styles.domainDot} />
            <Text style={styles.domainText}>{domain || '도메인을 입력하세요'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="example@company.com"
              autoCapitalize="none"
              keyboardType="email-address"
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

          {/* 링크 섹션 */}
          <View style={styles.linksWrap}>
            <Text style={styles.linksDivider}>또는</Text>
            <TouchableOpacity onPress={handleChangeDomain}>
              <Text style={styles.link}>다른 도메인으로 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert("아이디 찾기", "MVP: 추후 연결 예정")}>
              <Text style={styles.link}>아이디가 궁금하신가요?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert("비밀번호 재설정", "MVP: 추후 연결 예정")}>
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

  // 로고
  logoWrap: { alignItems: "center", marginBottom: 32 },
  logoOuter: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: "#2563eb",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  logoMid: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  logoInner: { flexDirection: "row", alignItems: "center" },
  dotLg: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2563eb", marginRight: 4 },
  dotMd: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb", marginRight: 4 },
  dotSm: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563eb" },
  appTitle: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  appSubtitle: { fontSize: 13, color: "#475569", marginTop: 4 },

  // 카드
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", textAlign: "center", marginBottom: 8 },

  domainRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  domainDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981", marginRight: 6 },
  domainText: { fontSize: 13, color: "#334155" },

  field: { marginTop: 12 },
  label: { fontSize: 13, color: "#334155", marginBottom: 6 },
  input: {
    height: 48, backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 12,
    fontSize: 14, color: "#0f172a",
  },

  primaryBtn: {
    marginTop: 20, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  outlineBtn: {
    marginTop: 10, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff",
  },
  outlineBtnText: { color: "#334155", fontSize: 15, fontWeight: "600" },

  linksWrap: { alignItems: "center", marginTop: 18 },
  linksDivider: { fontSize: 12, color: "#94a3b8", marginBottom: 8 },
  link: { fontSize: 13, color: "#2563eb", marginTop: 6 },
});
