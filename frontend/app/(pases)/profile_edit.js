// app/(pases)/profile_edit.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** BASE URL 자동 감지 (기존 login.js와 동일 컨벤션 유지) */
function deriveLanBase() {
  try {
    const expoManifest = Constants?.expoConfig || Constants?.manifest || {};
    const hostUri = expoManifest?.hostUri || "";
    if (hostUri) {
      const host = hostUri.split(":")[0];
      const isPrivateIPv4 =
        /^(10\.\d+\.\d+\.\d+)$/.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host) ||
        /^192\.168\.\d+\.\d+$/.test(host);
      if (isPrivateIPv4) return `http://${host}:8000`;
    }
  } catch {}
  return null;
}
const AUTO_LAN_URL = deriveLanBase();
const BASE =
  AUTO_LAN_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000");

/** AsyncStorage 키: 로그인 시 저장한 이메일 (없으면 폴백 입력 허용) */
const EMAIL_KEY = "gm_user_email";

export default function ProfileEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(
    typeof params?.email === "string" ? params.email : ""
  );
  const [name, setName] = useState("");
  const [userType, setUserType] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);

  // 비밀번호 변경(옵션)
  const [currentPw, setCurrentPw] = useState("");
  const [currentPwStatus, setCurrentPwStatus] = useState(null); // null|true|false
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMatch, setPwMatch] = useState(null); // null|true|false
  // 현재 비밀번호 실시간 확인
  const checkCurrentPassword = useCallback(async (pw) => {
    if (!email || !pw) {
      setCurrentPwStatus(null);
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/profile/check-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      setCurrentPwStatus(res.ok);
    } catch {
      setCurrentPwStatus(false);
    }
  }, [email]);

  // 새 비밀번호 일치 실시간 확인
  useEffect(() => {
    if (!newPw && !confirmPw) setPwMatch(null);
    else setPwMatch(newPw === confirmPw);
  }, [newPw, confirmPw]);

  /** 최초 이메일 자동 주입 */
  useEffect(() => {
    (async () => {
      if (!email) {
        const saved = await AsyncStorage.getItem(EMAIL_KEY);
        if (saved) setEmail(saved);
      }
    })();
  }, []);

  /** 프로필 가져오기 */
  const loadProfile = useCallback(async () => {
    if (!email) {
      Alert.alert("안내", "이메일을 먼저 입력하세요.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASE}/api/profile/me?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || "불러오기 실패");
      setName(json?.name || "");
      setUserType(json?.user_type || "");
      setDomain(json?.comp_domain || "");
    } catch (e) {
      Alert.alert("오류", String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { if (email) loadProfile(); }, [email]);

  /** 저장 (이름만 변경) */
  const onSave = useCallback(async () => {
    if (!email || !name.trim()) {
      Alert.alert("검증", "이메일과 이름을 입력하세요.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASE}/api/profile/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || "저장 실패");
      Alert.alert("완료", "개인정보가 저장되었습니다.");
      // 성공 시 이름 동기화
      setName(json?.name || name);
      await AsyncStorage.setItem(EMAIL_KEY, email);
    } catch (e) {
      Alert.alert("오류", String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [email, name]);

  /** 비밀번호 변경 */
  const onChangePassword = useCallback(async () => {
    if (!email) {
      Alert.alert("검증", "이메일을 먼저 입력하세요.");
      return;
    }
    if (!currentPw || !newPw) {
      Alert.alert("검증", "현재 비밀번호와 새 비밀번호를 입력하세요.");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("검증", "새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BASE}/api/profile/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, current_password: currentPw, new_password: newPw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || "비밀번호 변경 실패");
  Alert.alert("완료", "비밀번호가 변경되었습니다.");
  setCurrentPw(""); setNewPw(""); setConfirmPw("");
  await AsyncStorage.setItem(EMAIL_KEY, email);
  router.replace("/home");
    } catch (e) {
      Alert.alert("오류", String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [email, currentPw, newPw, confirmPw]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container}>

        {/* 비밀번호 변경 섹션 */}
        <Text style={s.subTitle}>비밀번호 변경</Text>

        <Text style={s.label}>현재 비밀번호</Text>
        <TextInput
          style={s.input}
          placeholder="현재 비밀번호"
          secureTextEntry
          value={currentPw}
          onChangeText={t => {
            setCurrentPw(t);
            checkCurrentPassword(t);
          }}
        />
        {currentPw.length > 0 && (
          <Text style={{ color: currentPwStatus === true ? '#22c55e' : currentPwStatus === false ? '#ef4444' : '#888', marginTop: 2, marginBottom: 2 }}>
            {currentPwStatus === true ? '비밀번호가 맞습니다.' : currentPwStatus === false ? '비밀번호가 틀립니다.' : ''}
          </Text>
        )}

        <Text style={s.label}>새 비밀번호</Text>
        <TextInput
          style={s.input}
          placeholder="새 비밀번호 (8자 이상 권장)"
          secureTextEntry
          value={newPw}
          onChangeText={setNewPw}
        />

        <Text style={s.label}>새 비밀번호 확인</Text>
        <TextInput
          style={s.input}
          placeholder="새 비밀번호 확인"
          secureTextEntry
          value={confirmPw}
          onChangeText={setConfirmPw}
        />
        {confirmPw.length > 0 && (
          <Text style={{ color: pwMatch === true ? '#22c55e' : pwMatch === false ? '#ef4444' : '#888', marginTop: 2, marginBottom: 2 }}>
            {pwMatch === true ? '새 비밀번호가 일치합니다.' : pwMatch === false ? '새 비밀번호가 일치하지 않습니다.' : ''}
          </Text>
        )}

        <TouchableOpacity style={s.secondaryBtn} onPress={onChangePassword} disabled={loading}>
          {loading ? <ActivityIndicator /> : <Text style={s.secondaryBtnText}>비밀번호 변경</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.linkBtn} onPress={() => router.back()}>
          <Text style={s.linkText}>← 돌아가기</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  subTitle: { fontSize: 18, fontWeight: "600", marginTop: 8, marginBottom: 8 },
  label: { fontSize: 14, marginTop: 12, marginBottom: 6, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  readonly: { backgroundColor: "#f6f6f6", color: "#666" },
  danger: { borderColor: "#ff7675" },
  row2: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  saveBtn: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 18 },
  linkBtn: { marginTop: 18, alignItems: "center" },
  linkText: { color: "#2563eb", fontWeight: "600" },
});
