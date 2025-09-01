import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
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
  // 사용자 정보 상태 (user_name, user_type 등)
  const [user, setUser] = useState(null);
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch(`${BASE}/auth/me`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("인증 실패");
        const me = await res.json();
        setUser(me);
      } catch (e) {
        setUser(null);
      }
    };
    fetchMe();
  }, []);

  const [tasks, setTasks] = useState([]);

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
      // 실패 시 무시
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const inputRef = useRef(null);
  const [shareTaskId, setShareTaskId] = useState(null);  // 공유할 task id

  // 기존 더미 FAQ (백업/폴백용, 유지)
  const faqs = useMemo(
    () => [
      "데이터 백업은 어떻게 하나요?",
      "공유하기 기능이 있나요?",
      "사내 메세지? 그걸로 일감 보내기",
      "일을 했으면 체크 하면 일감 준 분한테 알림 가게",
    ],
    []
  );

  // ✅ DB에서 views 내림차순 FAQ 불러오기 상태
  const [faqItems, setFaqItems] = useState([]);
  const [faqLoading, setFaqLoading] = useState(true);

  const loadFaq = useCallback(async () => {
    try {
      setFaqLoading(true);
      // [CHANGE 1] 상위 5개만 백엔드에서 가져오도록 변경
      const r = await fetch(`${BASE}/faq/top?limit=5`);
      const data = await r.json();
      // [{qa_id, question, answer, ref_article, views, rank}, ...]
      // [CHANGE 2] 혹시 /faq/top이 없을 경우 대비해 최대 5개만 표시
      setFaqItems(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (e) {
      console.warn("FAQ load error:", e);
      setFaqItems([]); // 실패 시 폴백(하드코딩 리스트)로 내려감
    } finally {
      setFaqLoading(false);
    }
  }, []);

  // ✅ 최초 로드 + 챗봇에서 refresh 이벤트 받으면 재조회
  useEffect(() => {
    loadFaq();

    const handler = () => loadFaq();
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("faq:refresh", handler);
      return () => {
        window.removeEventListener("faq:refresh", handler);
      };
    }
  }, [loadFaq]);

  const toggleTask = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  // 체크리스트 추가 (POST)
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
      // 실패 시 무시
    }
  }, [newTaskText]);

  // 포커스 자동
  useEffect(() => {
    if (showAddTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddTask]);

  // 체크리스트 삭제 (DELETE)
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
      // 실패 시 무시
    }
  }, []);

  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // 공유 모달 상태
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSearch, setShareSearch] = useState("");
  const [shareUsers, setShareUsers] = useState([]);

  // ✅ 같은 회사(comp_idx) 직원 불러오기
  useEffect(() => {
    const fetchShareUsers = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch(`${BASE}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("직원 목록 불러오기 실패");
        const data = await res.json();
        setShareUsers(data || []);
      } catch (e) {
        console.log("❌ 직원 목록 불러오기 실패", e);
      }
    };
    if (showShareModal) {
      fetchShareUsers();
    }
  }, [showShareModal]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.container}>
        {/* 헤더 */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <View style={s.headerTextBox}>
              <Text style={s.hello}>
                {user?.name ? `안녕하세요, ${user.name}님!` : "안녕하세요!"}
              </Text>
            </View>
            <View style={s.iconRow}>
              {/* user_type이 admin인 경우만 대시보드 버튼 노출 */}
              {user?.user_type === "admin" && (
                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    {
                      marginRight: 6,
                      backgroundColor: "#eef2ff",
                      borderWidth: 1,
                      borderColor: "#c7d2fe",
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => router.replace("/adminDashboard")}
                  accessibilityLabel="관리자 대시보드"
                >
                  <Text style={{ fontSize: 18 }}>🛠️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.iconBtn}
                activeOpacity={0.7}
                onPress={() => setShowProfileMenu((v) => !v)}
              >
                <Text style={s.iconTxt}>👤</Text>
              </TouchableOpacity>
              {/* 프로필 드롭다운 Modal */}
              <Modal
                visible={showProfileMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowProfileMenu(false)}
              >
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={() => setShowProfileMenu(false)}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: 110,
                      right: 18,
                      minWidth: 160,
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      shadowColor: '#000',
                      shadowOpacity: 0.12,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 8,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      paddingVertical: 4,
                    }}
                  >
                    <TouchableOpacity style={[s.profileMenuBtn, {paddingVertical:12, paddingHorizontal:18}]} onPress={() => {
                      setShowProfileMenu(false);
                      router.replace('/profile_edit');
                    }}>
                      <Text style={[s.profileMenuBtnTxt, {fontSize:15}]}>개인정보수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.profileMenuBtn, {paddingVertical:12, paddingHorizontal:18}]}
                      onPress={() => {
                        // 모든 쿠키 삭제 (웹 환경)
                        if (typeof document !== 'undefined') {
                          document.cookie.split(';').forEach(function(c) {
                            document.cookie = c
                              .replace(/^ +/, '')
                              .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                          });
                        }
                        setShowProfileMenu(false);
                        router.replace('/domain');
                      }}
                    >
                      <Text style={[s.profileMenuBtnTxt, { color: "#ef4444", fontSize:15 }]}>로그아웃</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>

          <View style={s.tipCard}>
            <Text style={s.tipTitle}>궁금한 것이 있으면 언제든 물어보세요</Text>
            <TouchableOpacity
              style={s.tipBtn}
              onPress={() => router.replace("/chat")}
            >
              <Text style={s.tipBtnTxt}>챗봇 열기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 오늘 할 일 */}
        <View style={s.card}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={s.cardTitle}>오늘 할 일</Text>
            <TouchableOpacity
              style={s.addTaskBtn}
              onPress={() => setShowAddTask(true)}
            >
              <Text style={s.addTaskBtnTxt}>＋</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10 }}>
            {tasks.map((t, idx) => (
              <View
                key={t.id}
                style={[s.taskRow, idx !== tasks.length - 1 && s.taskDivider]}
              >
                <TouchableOpacity
                  onPress={() => toggleTask(t.id)}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", flex: 1, alignItems: "center" }}
                >
                  <View style={[s.checkbox, t.done && s.checkboxOn]}>
                    {t.done ? <Text style={s.checkmark}>✓</Text> : null}
                  </View>
                  <View style={s.taskTextBox}>
                    <Text
                      style={[s.taskText, t.done && s.taskTextDone]}
                      numberOfLines={1}
                    >
                      {t.text}
                    </Text>
                    {!!t.due && !t.done && (
                      <Text style={s.taskDue}>⏰ {t.due}</Text>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShareTaskId(t.id);
                    setShowShareModal(true);
                  }}
                  style={s.shareTaskBtn}
                  activeOpacity={0.7}
                >
                  <Text style={s.shareTaskBtnTxt}>공유</Text>
                </TouchableOpacity>

                {/* 공유 모달 */}
                <Modal
                  visible={showShareModal}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowShareModal(false)}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={s.modalOverlay}
                  >
                    <View style={s.modalBoxBetter}>
                      <Text style={s.modalTitle}>공유할 사람 선택</Text>
                      <TextInput
                        style={[s.modalInput, { marginBottom: 10 }]}
                        value={shareSearch}
                        onChangeText={setShareSearch}
                        placeholder="이름 또는 이메일 검색"
                        autoFocus
                      />
                      <ScrollView
                        style={{ maxHeight: 220, marginBottom: 8 }}
                      >
                        {shareUsers
                          .filter(
                            (u) =>
                              !shareSearch.trim() ||
                              u.name.includes(shareSearch.trim()) ||
                              u.email.includes(shareSearch.trim())
                          )
                          .map((u) => (
                            <View
                              key={u.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: "#f1f5f9",
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontWeight: "700",
                                    color: "#1f2a44",
                                    fontSize: 15,
                                  }}
                                >
                                  {u.name}
                                </Text>
                                <Text
                                  style={{
                                    color: "#64748b",
                                    fontSize: 13,
                                  }}
                                >
                                  {u.email}
                                </Text>
                              </View>
                            </View>
                          ))}
                      </ScrollView>
                      <View style={s.modalBtnRow}>
                        <TouchableOpacity
                          style={s.addTaskModalBtn}
                          onPress={() => setShowShareModal(false)}
                        >
                          <Text style={s.addTaskModalBtnTxt}>확인 </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.cancelTaskModalBtn}
                          onPress={() => setShowShareModal(false)}
                        >
                          <Text style={s.cancelTaskModalBtnTxt}>취소</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                </Modal>

                <TouchableOpacity
                  onPress={() => deleteTask(t.id)}
                  style={s.deleteTaskBtn}
                  activeOpacity={0.7}
                >
                  <Text style={s.deleteTaskBtnTxt}>삭제</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* 자주 묻는 질문 */}
        <View style={s.card}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={s.cardTitle}>Q. 자주 묻는 질문</Text>
            <TouchableOpacity
              style={s.faqGoBtn}
              onPress={() => router.replace("/faq")}
              activeOpacity={0.7}
            >
              <Text style={s.faqGoBtnTxt}>{">"}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 8 }}>
            {/* DB 결과 우선, 실패/빈 배열이면 기존 더미 표시 */}
            {faqLoading ? (
              <View style={[s.faqRow, { justifyContent: "center" }]}>
                <Text style={s.faqText}>불러오는 중…</Text>
              </View>
            ) : faqItems.length > 0 ? (
              faqItems.map((f) => (
                <View key={f.qa_id} style={s.faqRow}>
                  <Text style={s.faqQ}>Q.</Text>
                  <Text style={s.faqText} numberOfLines={1}>
                    {f.question}
                  </Text>
                </View>
              ))
            ) : (
              faqs.slice(0, 5).map((q, i) => (  /* 폴백도 최대 5개 */
                <View key={i} style={s.faqRow}>
                  <Text style={s.faqQ}>Q.</Text>
                  <Text style={s.faqText} numberOfLines={1}>
                    {q}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* 할 일 추가 모달 */}
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
                <Text style={s.addTaskModalBtnTxt}>추가 </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelTaskModalBtn}
                onPress={() => setShowAddTask(false)}
              >
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
  shareTaskBtn: {
    marginLeft: 0,
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#e0e7ef",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  shareTaskBtnTxt: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 13,
  },
  modalBoxBetter: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 28,
    minWidth: 320,
    maxWidth: 380,
    flexDirection: "column",
    alignItems: "stretch",
    elevation: 8,
  },
  modalTitle: {
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 6,
    color: "#1f2a44",
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f7f9ff",
    marginBottom: 0,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  addTaskBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  addTaskBtnTxt: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 24,
  },
  deleteTaskBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  deleteTaskBtnTxt: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  safe: { flex: 1, backgroundColor: "#eaf2ff" },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  faqGoBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#e0e7ef",
    alignItems: "center",
    justifyContent: "center",
  },
  faqGoBtnTxt: {
    fontSize: 18,
    color: "#2563eb",
    fontWeight: "bold",
  },
  headerWrap: { gap: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextBox: { flexDirection: "column" },
  hello: { fontSize: 20, fontWeight: "800", color: "#0b347a" },
  iconRow: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffffaa",
    alignItems: "center",
    justifyContent: "center",
  },
  iconTxt: { fontSize: 18 },
  tipCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tipTitle: { color: "#1f2a44", fontSize: 14, marginBottom: 10 },
  tipBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  tipBtnTxt: { color: "#fff", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 0,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0b347a" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  taskDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f6",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#c8d3ee",
    backgroundColor: "#f3f6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxOn: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  checkmark: { color: "#fff", fontWeight: "800", fontSize: 14 },
  taskTextBox: { flex: 1 },
  taskText: { color: "#1f2a44", fontSize: 15, fontWeight: "600" },
  taskTextDone: { color: "#9aa9c2", textDecorationLine: "line-through" },
  taskDue: { marginTop: 4, color: "#f97316", fontSize: 12 },
  faqRow: {
    backgroundColor: "#f7f9ff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",       // 가로 배치
    alignItems: "center",
    marginTop: 8,
    zIndex: 0,
    // justifyContent: "space-between", ❌ 제거
  },
  faqQ: { color: "#2563eb", fontWeight: "800", marginRight: 8 },
  faqText: { color: "#1f2a44", fontSize: 14, flexShrink: 1 },
});
