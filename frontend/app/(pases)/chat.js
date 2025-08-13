import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";

// 메시지 객체는 JS에서는 타입 선언 없이 주석으로 설명만 남깁니다.
// type Message = { id: string; text: string; isUser: boolean; timestamp: Date; source?: any };

const EXTRA = (Constants.expoConfig?.extra) ?? {};
const API_BASE =
  EXTRA.API_BASE ??
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");

// ↓ FastAPI 주소: app.json에 { "expo": { "extra": { "FASTAPI_BASE": "http://<네PC IP>:8000" }}} 넣으면 그 값 사용
const FASTAPI_BASE =
  EXTRA.FASTAPI_BASE ??
  (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000");

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "안녕하세요! 회사 관련 궁금한 점이 있으시면 언제든 물어보세요. 📚",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // FastAPI 상태
  const [fastApiLoading, setFastApiLoading] = useState(false);
  const [fastApiResponse, setFastApiResponse] = useState("");

  const listRef = useRef(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const sendQuestion = useCallback(async (question) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error("질문 처리 중 오류가 발생했습니다.");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          text: data.answer || "죄송합니다. 응답을 생성할 수 없습니다.",
          isUser: false,
          timestamp: new Date(),
          source: data.source,
        },
      ]);
    } catch (err) {
      console.error("Error sending question:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          text: "죄송합니다. 현재 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg = {
      id: String(Date.now()),
      text: trimmed,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    sendQuestion(trimmed);
  }, [input, isLoading, sendQuestion]);

  // FastAPI 호출 (예시: /chat?q=테스트)
  const callFastAPI = useCallback(async () => {
    setFastApiLoading(true);
    setFastApiResponse("");
    try {
      const res = await fetch(`${FASTAPI_BASE}/chat?q=${encodeURIComponent("테스트")}`);
      if (!res.ok) throw new Error("FastAPI 호출 실패");
      const json = await res.json();
      setFastApiResponse(String(json.answer ?? "응답 없음"));
    } catch (error) {
      setFastApiResponse(`에러 발생 : ${error?.message ?? "알 수 없는 에러"}`);
    } finally {
      setFastApiLoading(false);
    }
  }, []);

  const renderItem = useCallback(({ item }) => {
    const bubbleStyle = item.isUser ? styles.userBubble : styles.botBubble;
    const textStyle = item.isUser ? styles.userText : styles.botText;
    return (
      <View style={[styles.msgRow, item.isUser ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, bubbleStyle]}>
          <Text style={[styles.msgText, textStyle]}>{item.text}</Text>
        </View>
      </View>
    );
  }, []);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.logoOuter}>
          <View style={styles.logoMid}>
            <View style={styles.logoInner} />
          </View>
        </View>
        <View>
          <Text style={styles.title}>Genmind AI</Text>
          <Text style={styles.subtitle}>온라인</Text>
        </View>
      </View>
    ),
    [router]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      {/* Header */}
      <View style={styles.headerWrap}>{header}</View>

      {/* Chat list */}
      <View style={styles.listWrap}>
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* FastAPI quick test block */}
      <View style={styles.fastapiBox}>
        <TouchableOpacity style={styles.fastapiBtn} onPress={callFastAPI} disabled={fastApiLoading}>
          {fastApiLoading ? <ActivityIndicator /> : <Text style={styles.fastapiBtnText}>FastAPI 호출</Text>}
        </TouchableOpacity>
        {!!fastApiResponse && <Text style={styles.fastapiResult}>{fastApiResponse}</Text>}
      </View>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="질문을 입력하세요..."
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={isLoading}>
          {isLoading ? <ActivityIndicator /> : <Text style={styles.sendText}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerWrap: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { padding: 8, marginRight: 6 },
  backIcon: { fontSize: 22, color: "#0f172a" },
  logoOuter: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#2563eb",
    alignItems: "center", justifyContent: "center", marginRight: 10,
  },
  logoMid: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  logoInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563eb" },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  subtitle: { fontSize: 12, color: "#64748b" },

  listWrap: { flex: 1 },
  listContent: { paddingVertical: 16, paddingHorizontal: 12 },
  msgRow: { marginVertical: 6, flexDirection: "row" },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  userBubble: { backgroundColor: "#e2f5ec" },
  botBubble: { backgroundColor: "#2563eb" },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#065f46", fontWeight: "500" },
  botText: { color: "#fff", fontWeight: "500" },

  fastapiBox: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  fastapiBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0ea5e9",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  fastapiBtnText: { color: "#fff", fontWeight: "700" },
  fastapiResult: { marginTop: 8, color: "#0f172a", fontSize: 13 },

  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: "#f1f5f9",
    borderRadius: 22,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0f172a",
  },
  sendBtn: {
    marginLeft: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  sendText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
