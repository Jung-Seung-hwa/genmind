import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Keyboard, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
         KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Modal } from "react-native";
import robotImg from "../images/robot_sample.jpg";
import { Image } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";

// ---- 자동 IP 추출 ----
function getHostIp() {
  // Expo Go/Dev Client에서 Metro 호스트 주소
  const hostUri =
    Constants.expoGoConfig?.hostUri ||
    Constants.expoConfig?.hostUri ||
    ""; // 없을 수도 있으니 대비

  if (!hostUri) return null;

  // 예: "exp://192.168.219.219:8081" 또는 "192.168.219.219:8081"
  const withoutProtocol = hostUri.replace(/^[a-zA-Z]+:\/\//, ""); // exp://, http:// 제거
  const noPath = withoutProtocol.split("/")[0]; // 뒤에 경로가 있으면 제거
  const ipOnly = noPath.split(":")[0]; // 포트 제거
  return ipOnly || null;
}

const hostIp = getHostIp();

const EXTRA = Constants.expoConfig?.extra ?? {};

const API_BASE =
  EXTRA.API_BASE ??
  (hostIp
    ? `http://${hostIp}:3000`
    : Platform.OS === "android"
      ? "http://10.0.2.2:3000"
      : "http://localhost:3000");

const FASTAPI_BASE =
  EXTRA.FASTAPI_BASE ??
  (hostIp
    ? `http://${hostIp}:8000`
    : Platform.OS === "android"
      ? "http://10.0.2.2:8000"
      : "http://localhost:8000");

// 확인용 로그(개발 중 1회)
console.log("FASTAPI_BASE:", FASTAPI_BASE);

export default function ChatScreen() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const insets = useSafeAreaInsets();
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
  const [loadingDots, setLoadingDots] = useState(1); // 1~3 반복
  const [showImageModal, setShowImageModal] = useState(false);

  // /chat 진입 시 자동으로 모달 한 번 띄우기
  useEffect(() => {
    setShowImageModal(true);
  }, []);

  // 답변 대기 중 ... .. ... 애니메이션
  useEffect(() => {
    if (!isLoading) return;
    let active = true;
    let dots = 1;
    const interval = setInterval(() => {
      if (!active) return;
      dots = dots % 3 + 1;
      setLoadingDots(dots);
    }, 400);
    return () => {
      active = false;
      clearInterval(interval);
      setLoadingDots(1);
    };
  }, [isLoading]);


  const listRef = useRef(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const sendQuestion = useCallback(async (question) => {
    setIsLoading(true);
    // 답변 대기 중 ... 메시지 추가
    setMessages((prev) => [
      ...prev,
      {
        id: "loading",
        text: ".",
        isUser: false,
        timestamp: new Date(),
        loading: true,
      },
    ]);
    try {
      // FastAPI 백엔드로 요청 (포트 8000, /api/chat/ask)
      const res = await fetch(`${FASTAPI_BASE}/api/chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error("질문 처리 중 오류가 발생했습니다.");

      const data = await res.json();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: String(Date.now()),
          text: data.answer || "죄송합니다. 응답을 생성할 수 없습니다.",
          isUser: false,
          timestamp: new Date(),
          sources: data.sources,
          source: data.sources,
        },
      ]);
    } catch (err) {
      console.error("Error sending question:", err);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
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


  const renderItem = useCallback(({ item }) => {
    const bubbleStyle = item.isUser ? styles.userBubble : styles.botBubble;
    const textStyle = item.isUser ? styles.userText : styles.botText;
    // 로딩 메시지라면 ... .. ...
    if (item.loading) {
      return (
        <View style={[styles.msgRow, styles.rowLeft]}>
          <View style={[styles.bubble, styles.botBubble]}>
            <Text style={[styles.msgText, styles.botText, { fontSize: 20, lineHeight: 20 }]}>{".".repeat(loadingDots)}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.msgRow, item.isUser ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, bubbleStyle]}>
          <Text style={[styles.msgText, textStyle]}>{item.text}</Text>
        </View>
      </View>
    );
  }, [loadingDots]);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Image
          source={require("../images/Chat.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={{ flex: 1 }}>
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

        {/* 이미지 팝업 버튼 예시 */}
        <TouchableOpacity onPress={() => setShowImageModal(true)} style={{ alignSelf: "center", margin: 16 }}>
          <Text style={{ color: "#2563eb" }}>로봇 이미지 보기</Text>
        </TouchableOpacity>

        {/* 이미지 모달 */}
        <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
          <View style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowImageModal(false)}
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Image
                source={robotImg}
                style={{ width: "100%", height: "100%", resizeMode: "contain" }}
              />
              <Text style={{
                position: "absolute",
                top: 40,
                right: 30,
                color: "#fff",
                fontWeight: "700",
                fontSize: 20,
                backgroundColor: "rgba(0,0,0,0.4)",
                padding: 8,
                borderRadius: 8
              }}>닫기</Text>
            </TouchableOpacity>
          </View>
        </Modal>

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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerWrap: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { padding: 8, marginRight: 6 },
  backIcon: { fontSize: 22, color: "#0f172a" },
  logoImg: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
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
