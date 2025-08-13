import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";

// 디자인 전용: 라우팅/스토리지 등 로직을 제거한 순수 UI 버전
export default function DomainScreen() {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const handlePress = () => {
    if (!domain.trim()) {
      Alert.alert("오류", "도메인을 입력해주세요.");
      return;
    }
    router.replace("/login");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* 로고 */}
        <View style={styles.logoContainer}>
          <View style={styles.logoOuter}>
            <View style={styles.logoMid}>
              <View style={styles.logoInner}>
                <View style={styles.logoDotLarge} />
                <View style={styles.logoDotMedium} />
                <View style={styles.logoDotSmall} />
              </View>
            </View>
          </View>
          <Text style={styles.title}>Genmind Chatbot</Text>
          <Text style={styles.subtitle}>중소기업 맞춤 자동응답 서비스</Text>
        </View>

        {/* 입력폼 */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>도메인 입력</Text>
          <Text style={styles.formSubtitle}>
            조직 도메인 입력해 주세요.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="gmchat.com"
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            keyboardType="default"
          />
          <Text style={styles.inputHint}>예: company.com</Text>

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.6 }]}
            onPress={handlePress}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "연결 중..." : "다음"}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>도메인이 등록되어 있지 않나요?</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>도메인 등록 문의</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 20,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoOuter: {
    width: 64,
    height: 64,
    backgroundColor: "#2563eb",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoMid: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  logoDotLarge: {
    width: 12,
    height: 12,
    backgroundColor: "#2563eb",
    borderRadius: 6,
  },
  logoDotMedium: {
    width: 8,
    height: 8,
    backgroundColor: "#2563eb",
    borderRadius: 4,
  },
  logoDotSmall: {
    width: 6,
    height: 6,
    backgroundColor: "#2563eb",
    borderRadius: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#0f172a",
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    height: 48,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  inputHint: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#2563eb",
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  footerLink: {
    fontSize: 13,
    color: "#2563eb",
    marginTop: 4,
  },
});
