// app/(auth)/forgot.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

/**
 * 비밀번호 찾기/재설정 페이지 (Expo Router + React Native + Web 호환)
 * - 단계1: 이메일로 재설정 링크 요청
 * - 단계2: 쿼리파라미터(token 또는 oobCode) 기반 새 비밀번호 설정
 *
 * 백엔드 가정:
 * POST {API_BASE}/api/auth/password/reset-request  { email }
 * POST {API_BASE}/api/auth/password/reset-confirm  { token, new_password }
 *
 * 환경변수:
 * EXPO_PUBLIC_API_BASE (없으면 127.0.0.1:8081)
 */

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8081";

const EMAIL_COOLDOWN_SEC = 60;

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const passwordStrength = (pwd) => {
  const v = String(pwd || "");
  let score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[a-z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  return score; // 0~5
};

export default function ForgotScreen() {
  const router = useRouter();

  // Expo Router가 없으면(웹 직접 진입 등) URLSearchParams로 보조
  const params = useLocalSearchParams?.() || {};
  const webParams = useMemo(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return null;
  }, []);

  const token =
    params.token ||
    params.oobCode ||
    (webParams ? webParams.get("token") || webParams.get("oobCode") : "");

  const modeParam =
    params.mode || (webParams ? webParams.get("mode") : "") || "";

  const inResetMode = Boolean(token) || modeParam === "reset";

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // 단계1: 이메일 전송
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSend = useCallback(async () => {
    setErrorMsg("");
    setInfoMsg("");

    if (!isEmail(email)) {
      setErrorMsg("올바른 이메일 주소를 입력하세요.");
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    try {
      // 보안상 이메일 존재여부를 숨기기 위해 항상 동일 응답 UX
      const res = await fetch(`${API_BASE}/api/auth/password/reset-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      // 실패든 성공이든 동일 메시지(정보 유출 방지)
      setInfoMsg(
        "이메일이 존재하는 경우, 재설정 링크가 전송되었습니다. 메일함(스팸 포함)을 확인해 주세요."
      );
      setCooldown(EMAIL_COOLDOWN_SEC);

      // 네트워크/서버 오류 시에도 같은 메시지 노출(콘솔로만 로깅)
      if (!res.ok) {
        // 자세한 에러는 개발 콘솔로
        const txt = await res.text().catch(() => "");
        console.warn("reset-request error:", res.status, txt);
      }
    } catch (e) {
      console.warn("reset-request network error:", e);
      setInfoMsg(
        "이메일이 존재하는 경우, 재설정 링크가 전송되었습니다. 메일함(스팸 포함)을 확인해 주세요."
      );
      setCooldown(EMAIL_COOLDOWN_SEC);
    } finally {
      setLoading(false);
    }
  }, [email, cooldown]);

  // 단계2: 새 비밀번호 설정
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const str = passwordStrength(pwd);

  const canSubmitNewPwd =
    pwd.length >= 8 && str >= 3 && pwd === pwd2 && Boolean(token);

  const handleReset = useCallback(async () => {
    setErrorMsg("");
    setInfoMsg("");

    if (!token) {
      setErrorMsg("유효하지 않은 재설정 링크입니다. 다시 시도해 주세요.");
      return;
    }
    if (!canSubmitNewPwd) {
      setErrorMsg("비밀번호 조건을 만족하고 두 입력이 일치해야 합니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/password/reset-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: String(token), new_password: pwd }),
      });

      if (!res.ok) {
        const data = await res
          .json()
          .catch(async () => ({ message: await res.text().catch(() => "") }));
        const msg =
          data?.message ||
          "재설정에 실패했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다.";
        setErrorMsg(msg);
      } else {
        setInfoMsg("비밀번호가 성공적으로 변경되었습니다. 로그인 화면으로 이동합니다.");
        setTimeout(() => {
          try {
            router.replace("/login");
          } catch {
            // 라우터가 없으면 대체
            if (typeof window !== "undefined") window.location.href = "/login";
          }
        }, 1200);
      }
    } catch (e) {
      console.warn("reset-confirm error:", e);
      setErrorMsg("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [token, pwd, canSubmitNewPwd, router]);

  // UI
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>
            {inResetMode ? "새 비밀번호 설정" : "비밀번호 찾기"}
          </Text>
          <Text style={styles.subtitle}>
            {inResetMode
              ? "아래에 새 비밀번호를 입력해 주세요."
              : "가입하신 이메일 주소로 비밀번호 재설정 링크를 보내드려요."}
          </Text>

          {!inResetMode ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>이메일</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={styles.input}
                  editable={!loading}
                />
                {!email ? null : isEmail(email) ? (
                  <Text style={styles.hintOk}>유효한 이메일 형식입니다.</Text>
                ) : (
                  <Text style={styles.hintWarn}>이메일 형식이 올바르지 않습니다.</Text>
                )}
              </View>

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
              {infoMsg ? <Text style={styles.info}>{infoMsg}</Text> : null}

              <TouchableOpacity
                onPress={handleSend}
                disabled={loading || cooldown > 0 || !isEmail(email)}
                style={[
                  styles.primaryBtn,
                  (loading || cooldown > 0 || !isEmail(email)) && styles.btnDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.btnText}>
                    {cooldown > 0 ? `다시 보내기 (${cooldown}s)` : "재설정 링크 보내기"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => {
                  try {
                    router.replace("/login");
                  } catch {
                    if (typeof window !== "undefined") window.location.href = "/login";
                  }
                }}
              >
                <Text style={styles.linkText}>로그인으로 돌아가기</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>새 비밀번호</Text>
                <TextInput
                  value={pwd}
                  onChangeText={setPwd}
                  placeholder="8자 이상, 대소문자/숫자/특수문자 조합 권장"
                  secureTextEntry
                  textContentType="newPassword"
                  style={styles.input}
                  editable={!loading}
                />
                <StrengthMeter score={str} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>새 비밀번호 확인</Text>
                <TextInput
                  value={pwd2}
                  onChangeText={setPwd2}
                  placeholder="비밀번호 재입력"
                  secureTextEntry
                  textContentType="newPassword"
                  style={styles.input}
                  editable={!loading}
                />
                {!pwd2 ? null : pwd === pwd2 ? (
                  <Text style={styles.hintOk}>비밀번호가 일치합니다.</Text>
                ) : (
                  <Text style={styles.hintWarn}>비밀번호가 일치하지 않습니다.</Text>
                )}
              </View>

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
              {infoMsg ? <Text style={styles.info}>{infoMsg}</Text> : null}

              <TouchableOpacity
                onPress={handleReset}
                disabled={loading || !canSubmitNewPwd}
                style={[
                  styles.primaryBtn,
                  (loading || !canSubmitNewPwd) && styles.btnDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.btnText}>비밀번호 변경</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => {
                  try {
                    router.replace("/login");
                  } catch {
                    if (typeof window !== "undefined") window.location.href = "/login";
                  }
                }}
              >
                <Text style={styles.linkText}>로그인으로 돌아가기</Text>
              </TouchableOpacity>
            </>
          )}

          {/* (선택) reCAPTCHA 영역 - 실제 적용 시 WebView/SDK 또는 백엔드 검증 연동 */}
          {/* <View style={{ marginTop: 16 }}>
            <Text style={{ color: '#888', fontSize: 12 }}>
              * 보호를 위해 자동화 방지 검증(reCAPTCHA 등)이 적용될 수 있습니다.
            </Text>
          </View> */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StrengthMeter({ score }) {
  const labels = ["너무 약함", "약함", "보통", "강함", "매우 강함"];
  const clamped = Math.max(0, Math.min(4, score - 1));
  const steps = [0, 1, 2, 3, 4];
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {steps.map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 4,
              backgroundColor: i <= clamped ? "#4F46E5" : "#E5E7EB",
            }}
          />
        ))}
      </View>
      <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
        강도: {labels[clamped]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  container: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow:
          "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
      },
      default: {
        elevation: 3,
      },
    }),
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 18,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  linkBtn: {
    marginTop: 12,
    alignItems: "center",
  },
  linkText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: -2,
    marginBottom: 6,
  },
  info: {
    color: "#065F46",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  hintOk: {
    color: "#059669",
    fontSize: 12,
    marginTop: 6,
  },
  hintWarn: {
    color: "#D97706",
    fontSize: 12,
    marginTop: 6,
  },
});
