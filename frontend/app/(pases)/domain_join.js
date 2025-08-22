import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";

export default function TrialScreen() {
  // 폼 상태
  const [subdomain, setSubdomain] = useState("");
  const [adminId, setAdminId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // 동의 체크박스
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);      // 필수 이용약관
  const [agreePrivacy, setAgreePrivacy] = useState(false);  // 필수 개인정보
  const [agreeAge, setAgreeAge] = useState(false);          // 필수 14세 이상
  const [agreeMkt, setAgreeMkt] = useState(false);          // 선택 마케팅

  const onToggleAll = () => {
    const next = !agreeAll;
    setAgreeAll(next);
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeAge(next);
    setAgreeMkt(next);
  };

  const requiredOK = agreeTerms && agreePrivacy && agreeAge;

  const sendCode = () => {
    if (!email.trim() || !email.includes("@")) {
      return Alert.alert("안내", "유효한 이메일을 입력하세요.");
    }
    setCodeSent(true);
    Alert.alert("안내", "인증번호를 발송했습니다. (데모)");
  };

  const onSubmit = () => {
    if (!subdomain.trim()) return Alert.alert("확인", "접속 주소(서브도메인)를 입력하세요.");
    if (!adminId.trim()) return Alert.alert("확인", "관리자 아이디를 입력하세요.");
    if (!pw.trim() || pw.length < 6) return Alert.alert("확인", "비밀번호는 6자 이상 입력하세요.");
    if (pw !== pw2) return Alert.alert("확인", "비밀번호 확인이 일치하지 않습니다.");
    if (!email.trim() || !email.includes("@")) return Alert.alert("확인", "유효한 이메일을 입력하세요.");
    if (!requiredOK) return Alert.alert("확인", "필수 약관에 모두 동의해 주세요.");

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert("제출 완료", "무료 체험 신청이 접수되었습니다. (데모)");
    }, 900);
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.select({ ios: 40, android: 0 })}
      >
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          {/* 헤더 */}
          <Text style={s.h1}>무료체험으로 시작하기</Text>

          {/* 안내 배너(간략화) */}
          <View style={s.bullets}>
            <Bullet>가입 신청 후 Genmind 관계 에이전트가 2~3일 이내 해당 회사에 연락드립니다.</Bullet>
            <Bullet>담당자 승인 절차를 거쳐 가입 여부를 확인합니다.</Bullet>
            <Bullet>승인이 완료되면 최종 가입이 진행되며, 서비스 이용을 시작하실 수 있습니다.</Bullet>
          </View>

          {/* 카드 */}
          <View style={s.card}>
            {/* 접속 주소 */}
            <Text style={s.label}>접속 주소</Text>
            <View style={s.domainRow}>
              <TextInput
                style={[s.input, s.inputGrow]}
                placeholder="ex) nhn"
                value={subdomain}
                onChangeText={setSubdomain}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={s.domainSuffix}>
                <Text style={s.domainSuffixTxt}>.gmchat.com</Text>
              </View>
            </View>

            {/* 관리자 아이디 / 비밀번호 */}
            <Text style={s.label}>관리자 아이디</Text>
            <TextInput
              style={s.input}
              placeholder="20자 이내"
              value={adminId}
              onChangeText={setAdminId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>관리자 비밀번호</Text>

            <TextInput
              style={s.input}
              placeholder="비밀번호 입력"
              value={pw}
              onChangeText={setPw}
              secureTextEntry
            />
            <TextInput
              style={[s.input, { marginTop: 10 }]}
              placeholder="비밀번호 재입력"
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
            />
            {/* 비밀번호 일치 안내 */}
            {pw && pw2 && pw === pw2 && (
              <Text style={{ fontSize: 12, color: '#22c55e', marginTop: 2, marginLeft: 2 }}>
                비밀번호가 같습니다
              </Text>
            )}

            {/* 메일 인증 */}
            <Text style={s.label}>메일인증</Text>
            <View style={s.row}>
              <TextInput
                style={[s.input, s.inputGrow]}
                placeholder="인증받을 메일주소를 입력해 주세요."
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={s.ghostBtn} onPress={sendCode}>
                <Text style={s.ghostBtnTxt}>인증 요청</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.row, { marginTop: 10 }]}> 
              <TextInput
                style={[s.input, s.inputGrow]}
                placeholder="인증번호를 입력해 주세요."
                value={code}
                onChangeText={setCode}
                editable={codeSent}
              />
              <TouchableOpacity
                style={[s.primarySm, !codeSent && { opacity: 0.5 }]}
                onPress={() => (codeSent ? Alert.alert("확인", "인증 완료(데모)") : null)}
                disabled={!codeSent}
              >
                <Text style={s.primarySmTxt}>확인</Text>
              </TouchableOpacity>
            </View>

            {/* 동의 체크박스 */}
            <View style={s.agreeBox}>
              <CheckRow
                label="아래 내용에 모두 동의합니다."
                checked={agreeAll}
                onPress={onToggleAll}
              />
              <Divider />
              <CheckRow
                label="[필수] 이용약관 동의"
                checked={agreeTerms}
                onPress={() => {
                  const v = !agreeTerms;
                  setAgreeTerms(v);
                  setAgreeAll(v && agreePrivacy && agreeAge && agreeMkt);
                }}
                trailing="전체보기 ›"
              />
              <CheckRow
                label="[필수] 개인 정보 수집 및 이용 동의"
                checked={agreePrivacy}
                onPress={() => {
                  const v = !agreePrivacy;
                  setAgreePrivacy(v);
                  setAgreeAll(agreeTerms && v && agreeAge && agreeMkt);
                }}
                trailing="전체보기 ›"
              />
              <CheckRow
                label="[필수] 만 14세 이상입니다."
                checked={agreeAge}
                onPress={() => {
                  const v = !agreeAge;
                  setAgreeAge(v);
                  setAgreeAll(agreeTerms && agreePrivacy && v && agreeMkt);
                }}
              />
              <CheckRow
                label="[선택] 마케팅 정보 수신 동의"
                checked={agreeMkt}
                onPress={() => {
                  const v = !agreeMkt;
                  setAgreeMkt(v);
                  setAgreeAll(agreeTerms && agreePrivacy && agreeAge && v);
                }}
                trailing="전체보기 ›"
              />
            </View>

            {/* 제출 버튼 */}
            <TouchableOpacity
              style={[s.primaryBtn, (!requiredOK || loading) && { opacity: 0.6 }]}
              disabled={!requiredOK || loading}
              onPress={onSubmit}
              activeOpacity={0.9}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>등록하기</Text>}
            </TouchableOpacity>

            <Text style={s.footerTxt}>
              이미 계정이 있으신가요? <Text style={s.link}>로그인</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- 재사용 컴포넌트 ---------- */
function Bullet({ children }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletTxt}>{children}</Text>
    </View>
  );
}

function CheckRow({ label, checked, onPress, trailing }) {
  return (
    <TouchableOpacity style={s.checkRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.checkbox, checked && s.checkboxOn]}>
        {checked ? <Text style={s.checkmark}>✓</Text> : null}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
      {!!trailing && <Text style={s.trailing}>{trailing}</Text>}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

/* ---------- 스타일 ---------- */
const cardShadow = Platform.select({
  web: { boxShadow: "0 6px 22px rgba(0,0,0,0.06)" },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, paddingBottom: 48, gap: 12 },

  h1: { fontSize: 28, fontWeight: "900", color: "#111827", marginTop: 8 },
  lead: { color: "#4b5563", marginTop: 6 },
  bold: { fontWeight: "900" },
  leadSub: { color: "#9ca3af", marginTop: 2 },

  bullets: { marginTop: 12, gap: 6 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start" },
  bulletDot: { width: 16, textAlign: "center", color: "#6b7280", marginTop: 1 },
  bulletTxt: { flex: 1, color: "#6b7280" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    ...cardShadow,
  },

  label: { marginTop: 12, marginBottom: 6, color: "#374151", fontWeight: "600" },

  // 입력 공통
  input: {
    height: 46,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputGrow: { flex: 1 },

  // 도메인
  domainRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  domainSuffix: {
    paddingHorizontal: 10,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  domainSuffixTxt: { color: "#374151", fontWeight: "700" },

  // 체크박스
  agreeBox: { marginTop: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: "#cbd5e1",
    alignItems: "center", justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#fff",
  },
  checkboxOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkmark: { color: "#fff", fontWeight: "900" },
  checkLabel: { flex: 1, color: "#111827" },
  trailing: { color: "#64748b", marginLeft: 8 },

  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 6 },

  // 캡차
  captcha: {
    marginTop: 14,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  captchaTxt: { color: "#6b7280" },

  // 버튼
  ghostBtn: {
    height: 46, paddingHorizontal: 12, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#eef2ff",
  },
  ghostBtnTxt: { color: "#1f2937", fontWeight: "700" },

  primarySm: {
    height: 46, paddingHorizontal: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#9db5ff",
  },
  primarySmTxt: { color: "#fff", fontWeight: "800" },

  primaryBtn: {
    marginTop: 16, height: 48, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },

  footerTxt: { textAlign: "center", marginTop: 14, color: "#6b7280" },
  link: { color: "#2563eb", fontWeight: "700" },
});
