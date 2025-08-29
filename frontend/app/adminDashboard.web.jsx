// app/adminDashboard.web.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 관리자 대시보드 Genmind 이미지 변경 import
import { Image } from "react-native";

/** FullCalendar CSS (Expo Web에서는 import 대신 <link> 주입) */
function useFullCalendarCss(version = "6.1.15") {
  useEffect(() => {
    const head = document.head;
    const hrefs = [
      `https://cdn.jsdelivr.net/npm/@fullcalendar/core@${version}/index.css`,
      `https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@${version}/index.css`,
    ];
    const links = hrefs.map((href) => {
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      head.appendChild(el);
      return el;
    });
    return () => links.forEach((el) => el && head.removeChild(el));
  }, [version]);
}

const API_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";

function Pill({ type = "gray", children }) {
  const map = { green: "#22c55e", amber: "#f59e0b", red: "#ef4444", gray: "#9ca3af" };
  return (
    <View style={[styles.pill, { backgroundColor: map[type] || map.gray }]}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

export default function AdminDashboardWeb() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tenant = String(params?.tenant || "").trim();

  useFullCalendarCss();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);
  // 캘린더
  const [events, setEvents] = useState([
    { title: "승인 마감", date: "2025-01-08" },
    { title: "정기 점검", date: "2025-01-15" },
    { title: "배포", date: "2025-01-29" },
  ]);
  const calendarRef = useRef(null);
  const [calendarTitle, setCalendarTitle] = useState("JANUARY 2025");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");

  // 업로드 + 분석
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null); // { filename, mime, size, pageCount, docType, summary, topics[], qa[] }
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState("");

  // Drag&Drop (web)
  useEffect(() => {
    // ✅ JWT 인증 → 사용자 정보 가져오기
    const fetchMe = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) {
          router.replace("/login");
          return;
        }
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Auth failed");
        const data = await res.json();
        setMe(data);
        // 관리자만 접근 가능
        if (data.user_type !== "admin") router.replace("/home");
      } catch (e) {
        console.error("auth error", e);
        router.replace("/login");
      } finally {
        setLoadingMe(false);
      }
    };
    fetchMe();

    if (!dropRef.current) return;
    const node = dropRef.current;
    const over = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
    const leave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
    const drop = (e) => {
      e.preventDefault(); e.stopPropagation(); setDragActive(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFileSelected(f);
    };
    node.addEventListener("dragover", over);
    node.addEventListener("dragleave", leave);
    node.addEventListener("drop", drop);
    return () => {
      node.removeEventListener("dragover", over);
      node.removeEventListener("dragleave", leave);
      node.removeEventListener("drop", drop);
    };
  }, []);

  const handleBtnClick = useCallback(() => inputRef.current?.click(), []);
  const onInputChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelected(f);
  }, []);

  // 파일 선택 → 분석 모달
  function handleFileSelected(file) {
    setSelectedFile(file);
    setShowAnalyzeModal(true);
    runAnalyze(file);
  }

  // 백엔드 없으면 목업으로 대체
  async function runAnalyze(file) {
    setError("");
    setSaveOk(false);
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/admin/files/analyze`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnalysis({
        filename: file.name,
        size: file.size,
        mime: file.type || data.mime || "application/octet-stream",
        tenant: tenant || data.tenant || "",
        ...data,
      });
    } catch (e) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const docType =
        ext === "pdf" ? "PDF 문서" :
          ["xls", "xlsx"].includes(ext) ? "스프레드시트" :
            "일반 문서";
      const mock = {
        filename: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        tenant,
        pageCount: ext === "pdf" ? 24 : undefined,
        docType,
        summary:
          "이 문서는 배송/환불, 계정, 가격 정책 등 고객 FAQ를 포함합니다. 중요 항목은 환불 절차, 배송비 기준, 관리자 계정 추가 방법입니다.",
        topics: ["배송비", "환불 절차", "관리자 계정", "가격 정책"],
        qa: [
          { q: "배송비는 얼마인가요?", a: "기본 3,000원이며 3만원 이상 무료입니다." },
          { q: "환불은 어떻게 하나요?", a: "구매 7일 이내 고객센터 또는 마이페이지에서 신청 가능합니다." },
          { q: "관리자 계정은 어떻게 추가하나요?", a: "관리 콘솔 > 사용자 > 초대하기에서 이메일을 입력해 초대합니다." },
        ],
      };
      setAnalysis(mock);
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSaveToDb() {
    if (!analysis) return;
    setSaving(true);
    setSaveOk(false);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/files/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysis),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveOk(true);
    } catch (e) {
      setError(`저장 실패: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const onLogout = async () => {
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <View style={styles.page}>
      {/* 상단 바 */}
      <View style={styles.topbar}>
        <View style={styles.topLeft}>
          <Text style={styles.brand}>
            {loadingMe ? "..." : me ? `${me.name}님` : "로그인 필요"}
          </Text>
          {me?.comp_domain && (
            <View style={styles.chipSoft}>
              <Text style={styles.chipSoftText}>{me.comp_domain}</Text>
            </View>
          )}
        </View>
        <View style={styles.topRight}>


          {/* ✅ Chat 버튼 (검은 배경 + 이미지 + 텍스트) */}
          <Pressable style={styles.btnDark} onPress={() => router.push("/chat")}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={require("./images/Chat.png")}
                style={{ width: 24, height: 22, resizeMode: "contain", marginRight: 6 }}
              />
              <Text style={styles.btnDarkText}>챗봇</Text>
            </View>
          </Pressable>


          {/* ✅ Home 버튼 (로그아웃 스타일) */}
          <Pressable style={styles.btnDark} onPress={() => router.push("/home")}>
            <Text style={styles.btnDarkText}>🏠 홈 화면</Text>
          </Pressable>

          <Pressable style={styles.btnDark} onPress={() => router.push("/profile")}>
            <Text style={styles.btnDarkText}>개인정보수정</Text>
          </Pressable>


          {/* 로그아웃 버튼 */}
          <Pressable style={styles.btnDark} onPress={onLogout}>
            <Text style={styles.btnDarkText}>로그아웃</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* 상단 2열: 업로드 + 문서 목록 */}
        <View style={styles.grid2}>
          {/* 문서 업로드 */}
          <View style={[styles.card, styles.cardUpload]}>
            <View style={styles.cardHead}>
              <Text style={styles.em}>📤</Text>
              <Text style={styles.cardTitle}>문서 업로드</Text>
            </View>

            <View
              ref={dropRef}
              style={[
                styles.uploadDrop,
                dragActive ? { borderColor: "#3b82f6", backgroundColor: "#e0e7ff" } : null,
              ]}
              tabIndex={0}
            >
              <Text style={styles.uploadArrow}>⬆</Text>
              <Text style={styles.uploadTitle}>
                {dragActive ? "여기에 파일을 놓으세요!" : "파일을 여기에 드래그하세요."}
              </Text>
              <Text style={styles.uploadSub}>PDF, Excel 파일 업로드도 가능합니다.</Text>

              {selectedFile && (
                <Text style={{ color: "#2563eb", marginTop: 8 }}>
                  선택된 파일: {selectedFile.name}
                </Text>
              )}

              {/* 업로드 페이지로 이동 */}
              <Pressable
                style={[styles.btnDark, { marginTop: 8 }]}
                onPress={() => router.replace("/faq-upload")}
              >
                <Text style={styles.btnDarkText}>파일 업로드</Text>
              </Pressable>

              {/* 숨겨둔 input (필요 시 사용) */}
              <input
                ref={inputRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                onChange={onInputChange}
              />
            </View>
          </View>

          {/* 업로드 된 문서 목록 */}
          <View style={styles.card}>
            <View style={[styles.cardHead, { alignItems: "center" }]}>
              <Text style={styles.em}>📄</Text>
              <Text style={styles.cardTitle}>업로드 된 문서 목록</Text>
              <View style={styles.tools}>
                {["업로드일순", "처리상태", "크기"].map((t) => (
                  <Pressable key={t} style={styles.link}><Text style={styles.linkText}>{t}</Text></Pressable>
                ))}
              </View>
            </View>

            {[
              { name: "사내규정.pdf", date: "2025-01-21", size: "12.5MB", status: <Pill type="green">승인</Pill> },
              { name: "신입사원 교육자료.pdf", date: "2025-02-21", size: "590.2MB", status: <Pill type="green">승인</Pill> },
              { name: "사용자 가이드.pdf", date: "2025-02-21", size: "970.6KB", status: <Pill type="red">실패</Pill> },
            ].map((f, i) => (
              <View key={i} style={[styles.row, styles.tableRow, { alignItems: "center" }]}>
                <View style={[styles.col, { flex: 2 }]}><Text style={{ fontWeight: "700" }}>{f.name}</Text></View>
                <View style={styles.col}><Text>{f.date}</Text></View>
                <View style={styles.col}><Text>{f.size}</Text></View>
                <View style={[styles.col, { minWidth: 80 }]}>{f.status}</View>
                <View style={[styles.col, { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", minWidth: 120 }]}>
                  <Pressable style={[styles.btnSm, styles.btnSmSolid]}><Text style={[styles.btnSmText, styles.btnSmTextSolid]}>다운로드</Text></Pressable>
                  <Pressable style={[styles.btnSm, styles.btnSmGhost]}><Text style={[styles.btnSmText, styles.btnSmTextGhost]}>삭제</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 캘린더 */}
        <View style={styles.grid2}>
          <View style={styles.card}>
            <View style={[styles.cardHead, { justifyContent: "space-between" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  style={styles.chevronBtn}
                  onPress={() => calendarRef.current?.getApi().prev()}
                >
                  <Text style={styles.chevronText}>◀</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>{calendarTitle}</Text>
                <Pressable
                  style={styles.chevronBtn}
                  onPress={() => calendarRef.current?.getApi().next()}
                >
                  <Text style={styles.chevronText}>▶</Text>
                </Pressable>
              </View>
              <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addBtnText}>＋</Text>
              </Pressable>
            </View>

            <View style={styles.calendarWrap}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate="2025-01-01"
                headerToolbar={false}
                height={600}
                events={events}
                selectable
                dateClick={(info) => setNewEventDate(info.dateStr)}
                viewDidMount={(arg) => setCalendarTitle(arg.view.title)}
                datesSet={(arg) => setCalendarTitle(arg.view.title)}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 일정 추가 모달 — 루트에서 렌더링 */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 12 }}>일정 추가</Text>
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              style={styles.inputWeb}
            />
            <input
              type="text"
              placeholder="일정 제목"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              style={{ ...styles.inputWeb, width: 220 }}
            />
            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
              <Pressable
                style={[styles.btnDark, { paddingHorizontal: 16 }]}
                onPress={() => {
                  if (newEventTitle && newEventDate) {
                    setEvents((prev) => [...prev, { title: newEventTitle, date: newEventDate }]);
                    setShowAddModal(false);
                    setNewEventTitle("");
                    setNewEventDate("");
                  }
                }}
              >
                <Text style={styles.btnDarkText}>추가</Text>
              </Pressable>
              <Pressable
                style={[styles.btnSm, styles.btnSmGhost]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.btnSmText}>취소</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 파일 분석 모달 */}
      {showAnalyzeModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: 720, maxWidth: "92vw" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontWeight: "800", fontSize: 18 }}>파일 분석</Text>
              <View style={{ marginLeft: "auto", flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={[styles.btnSm, styles.btnSmGhost]}
                  onPress={() => { setShowAnalyzeModal(false); setAnalysis(null); setError(""); setSaveOk(false); }}
                >
                  <Text style={styles.btnSmText}>닫기</Text>
                </Pressable>
              </View>
            </View>

            {!analysis && analyzing && (
              <Text style={{ color: "#334155" }}>분석 중입니다…</Text>
            )}

            {analysis && (
              <View style={{ gap: 12 }}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>파일명</Text><Text style={styles.kvVal}>{analysis.filename}</Text>
                </View>
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>형식</Text><Text style={styles.kvVal}>{analysis.docType || analysis.mime}</Text>
                </View>
                {analysis.pageCount != null && (
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>페이지</Text><Text style={styles.kvVal}>{analysis.pageCount} p</Text>
                  </View>
                )}
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>요약</Text><Text style={styles.kvVal}>{analysis.summary}</Text>
                </View>

                {!!analysis.topics?.length && (
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>토픽</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {analysis.topics.map((t, i) => (
                        <View key={i} style={styles.tag}>
                          <Text style={{ color: "#0f172a", fontSize: 12 }}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {!!analysis.qa?.length && (
                  <View>
                    <Text style={{ fontWeight: "700", marginBottom: 6 }}>추출된 Q&A</Text>
                    <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8 }}>
                      {analysis.qa.map((row, i) => (
                        <View key={i} style={{ padding: 10, borderTopWidth: i ? 1 : 0, borderTopColor: "#e5e7eb" }}>
                          <Text style={{ fontWeight: "700" }}>Q. {row.q}</Text>
                          <Text style={{ color: "#334155", marginTop: 4 }}>A. {row.a}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {!!error && <Text style={{ color: "#ef4444" }}>{error}</Text>}
                {saveOk && <Text style={{ color: "#16a34a" }}>저장 완료!</Text>}

                <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                  <Pressable
                    disabled={saving}
                    style={[styles.btnDark, { paddingHorizontal: 16, opacity: saving ? 0.7 : 1 }]}
                    onPress={onSaveToDb}
                  >
                    <Text style={styles.btnDarkText}>{saving ? "저장 중…" : "DB에 저장"}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fb" },

  /* Topbar */
  topbar: {
    height: 56, backgroundColor: "#3b82f6", paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between"
  },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { color: "#fff", fontWeight: "800" },
  iconBtn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  iconTxt: { color: "#fff", fontSize: 16 },

  chipSoft: { backgroundColor: "#eef2f7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipSoftText: { color: "#475569", fontSize: 12 },

  /* Layout */
  container: { padding: 20, gap: 10, width: '100%', minHeight: '100vh', maxWidth: '100%', alignSelf: 'stretch' },
  grid2: { flexDirection: "row", gap: 24, flexWrap: "wrap" },

  /* Card */
  card: { flex: 1, minWidth: 400, backgroundColor: "#fff", borderRadius: 12, borderWidth: 2, borderColor: "#d6dae2", padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,.05)" },
  cardUpload: { minWidth: 180, maxWidth: 400, height: 400, alignSelf: "flex-start" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  em: { fontSize: 18 },
  cardTitle: { fontWeight: "700" },
  tools: { flexDirection: "row", gap: 8, marginLeft: "auto" },

  /* Buttons */
  btnDark: { backgroundColor: "#000000ff", paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  btnDarkText: { color: "#fff", fontWeight: "700" },
  btnSm: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignSelf: "flex-start" },
  btnSmSolid: { backgroundColor: "#111827" },
  btnSmGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#d6dae2" },
  btnSmText: { fontSize: 12, fontWeight: "700" },
  btnSmTextSolid: { color: "#fff" },
  btnSmTextGhost: { color: "#334155" },

  /* Link */
  link: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  linkText: { color: "#6b7280" },

  /* Upload */
  uploadDrop: {
    height: 300, borderWidth: 2, borderColor: "#bfbfbf", borderStyle: "dashed",
    borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8
  },
  uploadArrow: { fontSize: 28, color: "#7f7f7f" },
  uploadTitle: { fontWeight: "700", color: "#555" },
  uploadSub: { fontSize: 12, color: "#9ca3af" },

  /* Calendar */
  chevronBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#f1f5f9" },
  chevronText: { fontSize: 20, color: "#334155" },
  addBtn: { backgroundColor: "#3b82f6", borderRadius: 999, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  calendarTitle: { fontSize: 28, fontWeight: "800", letterSpacing: 2 },
  calendarWrap: { width: "100%" },

  /* Table */
  table: { gap: 0 },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#e7ebf0" },
  tableRow: { paddingHorizontal: 4 },
  col: { flex: 1 },
  user: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  sub: { color: "#6b7280", fontSize: 12 },

  /* Badge */
  pill: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, alignSelf: "flex-start" },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  /* Modal / inputs */
  modalOverlay: {
    position: "fixed",
    top: 0, right: 0, bottom: 0, left: 0,         // inset 대신 4변 고정
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,                                  // 크게
    display: "flex",
    pointerEvents: "auto",
  },
  modalBox: { backgroundColor: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 24px rgba(0,0,0,.15)" },
  inputWeb: { marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid #d1d5db" },

  /* Key-Value rows */
  kvRow: { flexDirection: "row", gap: 12, marginBottom: 4, alignItems: "flex-start" },
  kvKey: { width: 72, color: "#64748b", fontWeight: "600" },
  kvVal: { flex: 1, color: "#0f172a" },

  /* tags */
  tag: { backgroundColor: "#eef2ff", borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
});
