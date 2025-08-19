// app/(pases)/home.js
import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";

export default function HomeScreen() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "아침 운동하기", done: false },
    { id: 2, text: "회의 자료 준비하기", done: true },
    { id: 3, text: "점심 약속 확인하기", done: false, due: "2025-08-12" },
    { id: 4, text: "프로젝트 리뷰하기", done: false },
    { id: 5, text: "주간 보고서 작성하기", done: false },
  ]);

  const faqs = useMemo(
    () => [
      "앱 사용법이 궁금해요",
      "계정 설정을 변경하려면?",
      "알림 설정은 어떻게 하나요?",
      "데이터 백업은 어떻게 하나요?",
      "dddd"
    ],
    []
  );

  const toggleTask = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  // 중복 선언 제거
  const router = useRouter();
  // 사람 아이콘 토글 메뉴 상태
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.container}>
        {/* 헤더 */}
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <View style={s.headerTextBox}>
              <Text style={s.hello}>안녕하세요, 김OO님!</Text>
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
                <Text style={s.iconTxt}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg></Text>
              </TouchableOpacity>
            </View>
            {/* 사람 아이콘 메뉴 */}
            {showProfileMenu && (
              <View style={s.profileMenuWrap}>
                <TouchableOpacity style={s.profileMenuBtn} onPress={() => {/* 개인정보수정 이동 */}}>
                  <Text style={s.profileMenuBtnTxt}>개인정보수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.profileMenuBtn} onPress={() => {/* 로그아웃 처리 */}}>
                  <Text style={s.profileMenuBtnTxt}>로그아웃</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={s.tipCard}>
            <Text style={s.tipTitle}>궁금한 것이 있으면 언제든 물어보세요</Text>
            <TouchableOpacity style={s.tipBtn} onPress={() => router.replace('/chat')}>
              <Text style={s.tipBtnTxt}>챗봇 열기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 오늘 할 일 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>오늘 할 일</Text>
          <View style={{ marginTop: 10 }}>
            {tasks.map((t, idx) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => toggleTask(t.id)}
                activeOpacity={0.8}
                style={[s.taskRow, idx !== tasks.length - 1 && s.taskDivider]}
              >
                <View style={[s.checkbox, t.done && s.checkboxOn]}>
                  {t.done ? <Text style={s.checkmark}>✓</Text> : null}
                </View>
                <View style={s.taskTextBox}>
                  <Text
                    style={[
                      s.taskText,
                      t.done && s.taskTextDone,
                    ]}
                    numberOfLines={1}
                  >
                    {t.text}
                  </Text>
                  {!!t.due && !t.done && (
                    <Text style={s.taskDue}>⏰ {t.due}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          
        </View>

        {/* 자주 묻는 질문 */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.cardTitle}>Q. 자주 묻는 질문</Text>
            <TouchableOpacity style={s.faqGoBtn} onPress={() => router.replace('/faq')} activeOpacity={0.7}>
              <Text style={s.faqGoBtnTxt}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 8 }}>
            {faqs.map((q, i) => (
              <View key={i} style={s.faqRow}>
                <Text style={s.faqQ}>Q.</Text>
                <Text style={s.faqText} numberOfLines={1}>{q}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#eaf2ff" },
  container: {
  faqGoBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#e0e7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ...기존 스타일 정의...
  faqGoBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#e0e7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqGoBtnTxt: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  faqGoBtnTxt: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
  },
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },

  // Header
  headerWrap: { gap: 12 },
  profileMenuWrap: {
    position: 'absolute',
    top: 48,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    paddingVertical: 4,
    minWidth: 120,
    zIndex: 10,
  },
  profileMenuBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'flex-start',
  },
  profileMenuBtnTxt: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextBox: { flexDirection: "column" },
  hello: { fontSize: 20, fontWeight: "800", color: "#0b347a" },
  iconRow: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#ffffffaa",
    alignItems: "center", justifyContent: "center",
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
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 999,
  },
  tipBtnTxt: { color: "#fff", fontWeight: "700" },

  // Card base
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0b347a" },

  // Tasks
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
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: "#c8d3ee",
    backgroundColor: "#f3f6ff",
    alignItems: "center", justifyContent: "center",
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

  secondaryBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#e6f0ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryBtnTxt: { color: "#2563eb", fontWeight: "700" },

  // FAQ
  faqRow: {
    backgroundColor: "#f7f9ff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  faqQ: { color: "#2563eb", fontWeight: "800", marginRight: 8 },
  faqText: { color: "#1f2a44", fontSize: 14, flex: 1 },
});
