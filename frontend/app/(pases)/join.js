// app/(page)/join.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";

export default function JoinScreen() {
  const { width } = useWindowDimensions();
  // 작은 폰에서도 동일한 레이아웃 유지: 최대 폭 360, 좌우는 5~6% 마진
  const CONTENT_MAX = 360;
  const horizontalPad = Math.max(16, Math.min(24, Math.round(width * 0.06)));

  // 폼 상태
  const [invite, setInvite] = useState("");   // 회사 시리얼(= comp_idx)
  const [name, setName] = useState("");
  const [position, setPosition] = useState(""); // 사용자 유형(user_type)
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  const BASE_URL = Platform.select({
    android: "http://10.0.2.2:8000",  // Android 에뮬레이터 → PC 로컬
    ios: "http://localhost:8000",     // iOS 시뮬레이터
    default: "http://localhost:8000", // Web/기타
  });
  const JOIN_URL = `${BASE_URL}/auth/join`; // 라우트 프리픽스가 있으면 바꿔: 예) /api/auth/join

  const onSubmit = async () => {
    if (!invite.trim()) return Alert.alert("확인", "회사 시리얼 넘버를 입력해주세요.");
    if (!name.trim()) return Alert.alert("확인", "이름을 입력해주세요.");
    if (!position.trim()) return Alert.alert("확인", "직책(사용자 유형)을 입력해주세요.");
    if (!email.trim() || !email.includes("@"))
      return Alert.alert("확인", "유효한 이메일을 입력해주세요.");
    if (!pw.trim() || pw.length < 6)
      return Alert.alert("확인", "비밀번호는 6자 이상 입력해주세요.");
    if (pw !== pw2) return Alert.alert("확인", "비밀번호 확인이 일치하지 않습니다.");

    try {
      setLoading(true);

      // 타임아웃 + 디버깅 로그
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);

      // position → user_type, serial → comp_idx(서버에서 매핑)
      const payload = {
        serial: invite,     // 서버에서 comp_idx(FK)로 해석/매핑
        email,              // PK
        name,
        password: pw,       // 백엔드에서 passwd 컬럼으로 저장
        user_type: position // 사용자 유형
      };

      console.log("POST", JOIN_URL, payload);

      const res = await fetch(JOIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      // 응답 파싱(텍스트 폴백 포함)
      let data = {};
      const text = await res.text();
      try { data = JSON.parse(text); } catch (_) {}

      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.message ||
          (res.status === 404
            ? "회사 시리얼 넘버를 찾을 수 없습니다."
            : res.status === 409
            ? "이미 가입된 이메일입니다."
            : res.status === 422
            ? "입력값이 올바르지 않습니다."
            : `HTTP ${res.status}`);
        return Alert.alert("오류", String(msg));
      }

      Alert.alert("완료", "가입 신청이 접수되었습니다.");
      // 필요하면 여기서 폼 초기화/네비게이션 처리
    } catch (e) {
      console.error("join error:", e);
      Alert.alert(
        "네트워크 오류",
        e.name === "AbortError" ? "요청이 시간초과되었습니다." : "서버에 연결할 수 없습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.select({ ios: 40, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: horizontalPad }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 상단 브랜드 영역 – 모바일 스샷과 동일한 밀도 */}
          <View style={s.brandWrap}>
            <View style={s.logoCircle}>
              <Text style={{ fontSize: 35 }}>🤖</Text>
            </View>
            <Text style={s.brand}>
              <Text style={{ color: "#2563eb", fontWeight: "800" }}>Genmind</Text>{" "}
              <Text style={{ color: "#0f172a", fontWeight: "800" }}>Chatbot</Text>
            </Text>
            <Text style={s.caption}>새 계정을 만들어주세요</Text>
          </View>

          {/* 폼 카드 – 폭 고정/가운데 정렬 */}
          <View style={[s.card, { maxWidth: CONTENT_MAX, alignSelf: "center" }]}>
            <Text style={s.title}>회원가입</Text>

            {/* 시리얼 넘버 */}
            <Text style={s.label}>시리얼 넘버</Text>
            <TextInput
              style={s.input}
              placeholder="시리얼 넘버를 입력하세요"
              value={invite}
              onChangeText={setInvite}
              autoCapitalize="none"
            />

            {/* 이름 */}
            <Text style={[s.label, { marginTop: 14 }]}>이름</Text>
            <View style={s.row2}>
              <TextInput
                style={[s.input, s.half]}
                placeholder="홍길동"
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
              />
            </View>

            {/* 직책(= user_type) */}
            <Text style={[s.label, { marginTop: 14 }]}>직책 (사용자 유형)</Text>
            <View style={s.row2}>
              <TextInput
                style={[s.input, s.half]}
                placeholder="예) user, manager, admin"
                value={position}
                onChangeText={setPosition}
                autoCapitalize="none"
              />
            </View>

            {/* 이메일 */}
            <Text style={[s.label, { marginTop: 14 }]}>이메일</Text>
            <TextInput
              style={s.input}
              placeholder="example@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* 비밀번호 */}
            <Text style={[s.label, { marginTop: 14 }]}>비밀번호</Text>
            <TextInput
              style={s.input}
              placeholder="비밀번호"
              value={pw}
              onChangeText={setPw}
              secureTextEntry
            />

            <Text style={[s.label, { marginTop: 14 }]}>비밀번호 확인</Text>
            <TextInput
              style={s.input}
              placeholder="비밀번호 확인"
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
            />

            <TouchableOpacity
              onPress={onSubmit}
              style={[s.submit, loading && { opacity: 0.7 }]}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitTxt}>가입하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  web: { boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }, // RN Web 권장 방식
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  scroll: {
    paddingTop: 16,
    paddingBottom: 32,
  },

  // 상단 브랜드
  brandWrap: { alignItems: "center", marginBottom: 6 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#e6f0ff",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  brand: { fontSize: 22, marginTop: 2 },
  caption: { color: "#6b7280", marginTop: 4 },

  // 카드 & 폼
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    ...cardShadow,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 10,
  },
  label: { fontSize: 13, color: "#111827", marginBottom: 6, marginTop: 6 },
  input: {
    height: 46,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  row2: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },

  submit: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    marginTop: 18,
  },
  submitTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
