import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";   // ✅ 추가
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from "react-native";

// ✅ LAN IP 자동 감지 (login.js와 동일 로직)
const deriveLanBase = () => {
  const sources = [
    Constants?.expoConfig?.hostUri,
    Constants?.expoGoConfig?.hostUri,
    Constants?.manifest?.debuggerHost,
  ].filter(Boolean);

  for (const s of sources) {
    const host = String(s).split(":")[0];
    if (
      /^10\.\d+\.\d+\.\d+$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host) ||
      /^192\.168\.\d+\.\d+$/.test(host)
    ) {
      return `http://${host}:8000`;
    }
  }
  return "http://localhost:8000"; // fallback
};

const BASE = deriveLanBase();

export default function HomeScreen() {
  const [userName, setUserName] = useState("");
  const [tasks, setTasks] = useState([]); // DB에서 불러온 체크리스트
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const inputRef = useRef(null);
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // 내 정보 가져오기
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        console.log("👉 BASE_URL:", BASE);
        console.log("👉 access_token:", token);

        if (!token) return;
        const res = await fetch(`${BASE}/auth/me`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("인증 실패");
        const me = await res.json();
        setUserName(me?.name || "");
      } catch (e) {
        console.log("❌ me 불러오기 실패:", e);
      }
    };
    fetchMe();
  }, []);

  // 체크리스트 불러오기
  const fetchChecklist = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch(`${BASE}/checklist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("체크리스트 불러오기 실패");
      const data = await res.json();
      const mapped = data.map((c) => ({
        id: c.item_id,
        text: c.item,
        done: !!c.is_done,
        due: c.deadline
          ? `마감: ${c.deadline}`
          : c.from_user
          ? `from: ${c.from_user}`
          : null,
      }));
      setTasks(mapped);
    } catch (e) {
      console.log("❌ 체크리스트 불러오기 실패:", e);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  // ✅ 체크리스트 추가 (POST)
  const addTask = useCallback(async () => {
    if (!newTaskText.trim()) return;
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch(`${BASE}/checklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item: newTaskText.trim() }),
      });
      if (!res.ok) throw new Error("추가 실패");
      const newItem = await res.json();
      setTasks((prev) => [
        {
          id: newItem.item_id,
          text: newItem.item,
          done: newItem.is_done,
          due: newItem.deadline ? `마감: ${newItem.deadline}` : null,
        },
        ...prev,
      ]);
      setNewTaskText("");
      setShowAddTask(false);
    } catch (e) {
      Alert.alert("오류", "체크리스트 추가 실패");
    }
  }, [newTaskText]);

  // ✅ 체크리스트 완료 토글 (PUT)
  const toggleTask = useCallback(async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch(`${BASE}/checklist/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_done: !task.done }),
      });
      if (!res.ok) throw new Error("업데이트 실패");
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, done: updated.is_done } : t
        )
      );
    } catch (e) {
      Alert.alert("오류", "체크리스트 업데이트 실패");
    }
  }, [tasks]);

  // ✅ 체크리스트 삭제 (DELETE)
  const deleteTask = useCallback(async (id) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch(`${BASE}/checklist/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("삭제 실패");
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      Alert.alert("오류", "체크리스트 삭제 실패");
    }
  }, []);

  const faqs = useMemo(
    () => [
      "데이터 백업은 어떻게 하나요?",
      "공유하기 기능이 있나요?",
      "사내 메세지? 그걸로 일감 보내기",
      "일을 했으면 체크 하면 일감 준 분한테 알림 가게",
    ],
    []
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.container}>
        {/* 헤더 */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <View style={s.headerTextBox}>
              <Text style={s.hello}>
                {userName ? `안녕하세요, ${userName}님!` : "안녕하세요!"}
              </Text>
            </View>
            <View style={s.iconRow}>
              <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
                <Text style={s.iconTxt}>🔔</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.iconBtn}
                activeOpacity={0.7}
                onPress={() => setShowProfileMenu((v) => !v)}
              >
                <Text style={s.iconTxt}>👤</Text>
              </TouchableOpacity>
            </View>

            {showProfileMenu && (
              <View style={s.profileMenuWrap}>
                <TouchableOpacity style={s.profileMenuBtn}>
                  <Text style={s.profileMenuBtnTxt}>개인정보수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.profileMenuBtn}>
                  <Text style={[s.profileMenuBtnTxt, { color: "#ef4444" }]}>로그아웃</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={s.tipCard}>
            <Text style={s.tipTitle}>궁금한 것이 있으면 언제든 물어보세요</Text>
            <TouchableOpacity style={s.tipBtn} onPress={() => router.replace("/chat")}>
              <Text style={s.tipBtnTxt}>챗봇 열기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 오늘 할 일 */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={s.cardTitle}>오늘 할 일</Text>
            <TouchableOpacity style={s.addTaskBtn} onPress={() => setShowAddTask(true)}>
              <Text style={s.addTaskBtnTxt}>＋</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10 }}>
            {tasks.map((t, idx) => (
              <View key={t.id} style={[s.taskRow, idx !== tasks.length - 1 && s.taskDivider]}>
                <TouchableOpacity
                  onPress={() => toggleTask(t.id)}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", flex: 1, alignItems: "center" }}
                >
                  <View style={[s.checkbox, t.done && s.checkboxOn]}>
                    {t.done ? <Text style={s.checkmark}>✓</Text> : null}
                  </View>
                  <View style={s.taskTextBox}>
                    <Text style={[s.taskText, t.done && s.taskTextDone]} numberOfLines={1}>
                      {t.text}
                    </Text>
                    {!!t.due && !t.done && <Text style={s.taskDue}>{t.due}</Text>}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={s.shareTaskBtn} activeOpacity={0.7}>
                  <Text style={s.shareTaskBtnTxt}>공유</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => deleteTask(t.id)} style={s.deleteTaskBtn} activeOpacity={0.7}>
                  <Text style={s.deleteTaskBtnTxt}>삭제</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* 자주 묻는 질문 */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={s.cardTitle}>Q. 자주 묻는 질문</Text>
            <TouchableOpacity style={s.faqGoBtn} onPress={() => router.replace("/faq")} activeOpacity={0.7}>
              <Text style={s.faqGoBtnTxt}>{">"}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 8 }}>
            {faqs.map((q, i) => (
              <View key={i} style={s.faqRow}>
                <Text style={s.faqQ}>Q.</Text>
                <Text style={s.faqText} numberOfLines={1}>
                  {q}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 모달 */}
      <Modal
        visible={showAddTask}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddTask(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalBoxBetter}>
            <Text style={s.modalTitle}>할 일 추가</Text>
            <TextInput
              ref={inputRef}
              style={s.modalInput}
              value={newTaskText}
              onChangeText={setNewTaskText}
              placeholder="할 일을 입력하세요"
              returnKeyType="done"
              onSubmitEditing={addTask}
              autoFocus
            />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.addTaskModalBtn} onPress={addTask}>
                <Text style={s.addTaskModalBtnTxt}>추가</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelTaskModalBtn} onPress={() => setShowAddTask(false)}>
                <Text style={s.cancelTaskModalBtnTxt}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // 스타일 동일 (생략)
  shareTaskBtn: { marginLeft: 0, marginRight: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#e0e7ef", alignItems: "center", justifyContent: "center", alignSelf: "center" },
  shareTaskBtnTxt: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  modalBoxBetter: { backgroundColor: "#fff", borderRadius: 18, padding: 28, minWidth: 320, maxWidth: 380, flexDirection: "column", alignItems: "stretch", elevation: 8 },
  modalTitle: { fontWeight: "800", fontSize: 20, marginBottom: 6, color: "#1f2a44", textAlign: "center" },
  modalInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#f7f9ff", marginBottom: 0 },
  modalBtnRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  addTaskBtn: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  addTaskBtnTxt: { color: "#fff", fontSize: 22, fontWeight: "bold", lineHeight: 24 },
  deleteTaskBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", alignSelf: "center" },
  deleteTaskBtnTxt: { color: "#ef4444", fontWeight: "700", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  safe: { flex: 1, backgroundColor: "#eaf2ff" },
  container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 14 },
  faqGoBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "#e0e7ef", alignItems: "center", justifyContent: "center" },
  faqGoBtnTxt: { fontSize: 18, color: "#2563eb", fontWeight: "bold" },
  headerWrap: { gap: 12 },
  profileMenuWrap: { position: "absolute", top: 48, right: 0, backgroundColor: "#fff", borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, paddingVertical: 4, minWidth: 120, zIndex: 10 },
  profileMenuBtn: { paddingVertical: 12, paddingHorizontal: 18, alignItems: "flex-start" },
  profileMenuBtnTxt: { fontSize: 15, color: "#2563eb", fontWeight: "700" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTextBox: { flexDirection: "column" },
  hello: { fontSize: 20, fontWeight: "800", color: "#0b347a" },
  iconRow: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffffaa", alignItems: "center", justifyContent: "center" },
  iconTxt: { fontSize: 18 },
  tipCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  tipTitle: { color: "#1f2a44", fontSize: 14, marginBottom: 10 },
  tipBtn: { backgroundColor: "#2563eb", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  tipBtnTxt: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, zIndex: 0 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0b347a" },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  taskDivider: { borderBottomWidth: 1, borderBottomColor: "#eef1f6" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#c8d3ee", backgroundColor: "#f3f6ff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkboxOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkmark: { color: "#fff", fontWeight: "800", fontSize: 14 },
  taskTextBox: { flex: 1 },
  taskText: { color: "#1f2a44", fontSize: 15, fontWeight: "600" },
  taskTextDone: { color: "#9aa9c2", textDecorationLine: "line-through" },
  taskDue: { marginTop: 4, color: "#f97316", fontSize: 12 },
  secondaryBtn: { marginTop: 12, alignSelf: "flex-start", backgroundColor: "#e6f0ff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  secondaryBtnTxt: { color: "#2563eb", fontWeight: "700" },
  faqRow: { backgroundColor: "#f7f9ff", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginTop: 8, zIndex: 0 },
  faqQ: { color: "#2563eb", fontWeight: "800", marginRight: 8 },
  faqText: { color: "#1f2a44", fontSize: 14, flex: 1 },
});
