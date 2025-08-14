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
  const [invite, setInvite] = useState("");
  const [empNo, setEmpNo] = useState("");
  const [mgrNo, setMgrNo] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = () => {
    if (!invite.trim()) return Alert.alert("확인", "초대 링크를 입력해주세요.");
    if (!empNo.trim()) return Alert.alert("확인", "사번을 입력해주세요.");
    if (!mgrNo.trim()) return Alert.alert("확인", "사번관리번호를 입력해주세요.");
    if (!email.trim() || !email.includes("@"))
      return Alert.alert("확인", "유효한 이메일을 입력해주세요.");
    if (!pw.trim() || pw.length < 6)
      return Alert.alert("확인", "비밀번호는 6자 이상 입력해주세요.");
    if (pw !== pw2) return Alert.alert("확인", "비밀번호 확인이 일치하지 않습니다.");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("가입 요청", "제출 완료! (백엔드 연결 전)");
    }, 700);
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

            {/* 초대 링크 */}
            <Text style={s.label}>초대 링크</Text>
            <TextInput
              style={s.input}
              placeholder="초대 링크를 입력하세요"
              value={invite}
              onChangeText={setInvite}
              autoCapitalize="none"
            />

            {/* 사번/사번관리번호 – 2열, 작은 폭에서는 자동 줄바꿈 없이 동일 비율 */}
            <Text style={[s.label, { marginTop: 14 }]}>사번</Text>
            <View style={s.row2}>
              <TextInput
                style={[s.input, s.half]}
                placeholder="EMP001"
                value={empNo}
                onChangeText={setEmpNo}
                autoCapitalize="characters"
              />
              <TextInput
                style={[s.input, s.half]}
                placeholder="MG001"
                value={mgrNo}
                onChangeText={setMgrNo}
                autoCapitalize="characters"
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
