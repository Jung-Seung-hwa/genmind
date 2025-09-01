// app/faq-upload.web.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Constants from "expo-constants";

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000");

function Pill({ children, color = "#334155", bg = "#e2e8f0" }) {
  return (
    <View style={{ backgroundColor: bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 }}>
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

export default function FaqUploadPage() {
  const router = useRouter();

  const inputRef = useRef(null);
  const dropRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);

  const [step, setStep] = useState("idle");

  const [fileId, setFileId] = useState(null);
  const [summary, setSummary] = useState("");
  const [faqs, setFaqs] = useState([]);

  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // ★ 로그인한 사용자(회사 도메인 사용) 로드
  const [user, setUser] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const raw =
          (await AsyncStorage.getItem("user")) ||
          (await AsyncStorage.getItem("auth")) ||
          (await AsyncStorage.getItem("profile"));
        const u = raw ? JSON.parse(raw) : null;
        setUser(u);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!dropRef.current) return;
    const node = dropRef.current;
    const onOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
    const onLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
    const onDrop = (e) => {
      e.preventDefault(); e.stopPropagation(); setDragActive(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) handleSelectedFile(f);
    };
    node.addEventListener("dragover", onOver);
    node.addEventListener("dragleave", onLeave);
    node.addEventListener("drop", onDrop);
    return () => {
      node.removeEventListener("dragover", onOver);
      node.removeEventListener("dragleave", onLeave);
      node.removeEventListener("drop", onDrop);
    };
  }, []);

  const clickChoose = useCallback(() => inputRef.current?.click(), []);
  const onInputChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) handleSelectedFile(f);
  }, []);
  
  /** 파일 선택 후 전체 플로우 시작 */
  async function handleSelectedFile(f) {
    setError(""); setOkMsg("");
    setFile(f);
    setStep("uploading");
    try {
      // 1) 업로드
      const fd = new FormData();
      fd.append("file", f);
      const upRes = await fetch(`${API_BASE}/admin/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await AsyncStorage.getItem("access_token")}`,
        },
        body: fd,
      });
      if (!upRes.ok) throw new Error(`업로드 실패 HTTP ${upRes.status}`);
      const upJson = await upRes.json(); // { file_id, path }
      const fid = upJson.file_id; // ✅ 원래 파일명 그대로
      setFileId(fid);
      setFile(f); 

      // 2) 추출
      setStep("extracting");
      const exRes = await fetch(`${API_BASE}/admin/files/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await AsyncStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ file_id: fid }), // ✅ 원래 파일명 전달
      });
      if (!exRes.ok) throw new Error(`추출 실패 HTTP ${exRes.status}`);
      const exJson = await exRes.json(); // { summary, faqs:[{q,a}] }

      const extractedFaqs = exJson.faqs || [];
      console.log(`총 ${extractedFaqs.length}개의 QA가 추출되었습니다.`);

      setSummary(exJson.summary || "");
      setFaqs(Array.isArray(extractedFaqs) ? extractedFaqs : []);
      setStep("review");
    } catch (e) {
      console.warn("[mock] falling back:", e?.message);
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      const mockFaqs = [
        { q: "배송비는 얼마인가요?", a: "기본 3,000원이며 3만원 이상 무료입니다." },
        { q: "환불은 어떻게 하나요?", a: "구매 7일 이내 고객센터 또는 마이페이지에서 신청하세요." },
        { q: "계정은 몇 개까지 만들 수 있나요?", a: "요금제에 따라 다르며, 기본은 3개입니다." },
      ];
      setFileId("mock-file-123");
      setSummary(
        ext === "pdf"
          ? "PDF 문서에서 주요 고객문의(배송, 환불, 계정)를 추출했습니다. 아래 항목을 검토·수정 후 저장하세요."
          : "문서에서 FAQ 후보를 생성했습니다. 아래 항목을 검토·수정 후 저장하세요."
      );
      setFaqs(mockFaqs);
      setStep("review");
      setOkMsg("서버가 없어 목업 데이터로 표시합니다.");
    }
  }

  // ★ /faq/commit 호출 유틸 (백엔드와 계약된 스키마)
  async function commitFAQs({ baseUrl, comp_domain, qaList, scFile  }) {
    const payload = {
      comp_domain,
      source_file: scFile,
      items: qaList.map((x) => ({
        qa_id: x.id ?? null,              // 수정건이면 id(qa_id) 전달, 신규면 null
        question: String(x.q || "").trim(),
        answer: String(x.a || "").trim(),
        ref_article: x.ref_article ?? null,
      })),
    };

    const res = await fetch(`${baseUrl}/faq/commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await AsyncStorage.getItem("access_token")}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`저장 실패 HTTP ${res.status}`);
    return res.json(); // {ok, faq_ids, count}
  }

  /** 저장 */
  async function handleSave() {
    if (!faqs.length) {
      setError("FAQ 항목이 없습니다. 최소 1개 이상 입력해 주세요.");
      return;
    }
    setError(""); setOkMsg("");
    setStep("saving");
    try {
      // ★ 회사 도메인 결정 (없으면 안전값)
      const compDomain =
        user?.comp_domain ||
        user?.company?.domain ||
        "example.com";

      // ★ /faq/commit 로 저장 + (백엔드에서) 임베딩/FAISS 업서트 트리거
      const result = await commitFAQs({
        baseUrl: API_BASE,
        comp_domain: compDomain,
        qaList: faqs, // 현재 편집한 리스트
        scFile: file?.name || "manual", 
      });

      setStep("done");
      setOkMsg(`DB 저장 완료! (${result.count}건). 임베딩/색인 작업을 시작했어요.`);
    } catch (e) {
      setError(e.message || "저장 중 오류가 발생했습니다.");
      setStep("review");
    }
  }

  /** 항목 제어 */
  const updateFaq = (idx, key, val) => {
    setFaqs((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));
  };
  const addFaq = () => setFaqs((prev) => [...prev, { q: "", a: "" }]);
  const removeFaq = (idx) => setFaqs((prev) => prev.filter((_, i) => i !== idx));
  const resetAll = () => {
    setFile(null); setFileId(null); setSummary(""); setFaqs([]);
    setError(""); setOkMsg(""); setStep("idle");
  };

  return (
    <View style={st.page}>
      <View style={st.header}>
        <Text style={st.title}>FAQ 만들기 · 파일 업로드</Text>
        <View style={st.stepRow}>
          <Pill bg={step === "uploading" ? "#dbeafe" : "#e2e8f0"} color="#1e40af">1. 업로드</Pill>
          <Pill bg={step === "extracting" ? "#dbeafe" : "#e2e8f0"} color="#1e40af">2. 추출</Pill>
          <Pill bg={step === "review" ? "#dbeafe" : "#e2e8f0"} color="#1e40af">3. 검토/수정</Pill>
          <Pill bg={step === "saving" ? "#dbeafe" : step === "done" ? "#dcfce7" : "#e2e8f0"} color="#166534">
            4. 저장
          </Pill>
        </View>
      </View>

      <ScrollView contentContainerStyle={st.container}>
        <View style={[st.card, { maxWidth: 1400, minWidth: 1200, alignSelf: "center", width: "100%" }]}>
          <Text style={st.cardTitle}>문서 업로드</Text>
          <View
            ref={dropRef}
            style={[
              st.drop,
              dragActive && { borderColor: "#3b82f6", backgroundColor: "#eff6ff" },
            ]}
            tabIndex={0}
          >
            <Text style={st.arrow}>⬆</Text>
            <Text style={st.dropTitle}>파일을 여기에 드래그하세요.</Text>
            <Text style={st.dropSub}>PDF, Excel, Word 등 업로드 가능합니다.</Text>

            {file && (
              <Text style={{ color: "#2563eb", marginTop: 8, fontWeight: "700" }}>
                선택된 파일: {file.name}
              </Text>
            )}

            <Pressable onPress={clickChoose} style={[st.btnDark, { marginTop: 10 }]}>
              <Text style={st.btnDarkTxt}>파일 업로드</Text>
            </Pressable>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              style={{ display: "none" }}
              onChange={onInputChange}
            />
          </View>

          {/* 상태 표시 */}
          <View style={{ marginTop: 12 }}>
            {step === "uploading" && <Text style={st.info}>업로드 중…</Text>}
            {step === "extracting" && <Text style={st.info}>FAQ 추출 중…</Text>}
            {okMsg ? <Text style={st.ok}>{okMsg}</Text> : null}
            {error ? <Text style={st.err}>{error}</Text> : null}
          </View>
        </View>

        {/* 검토/수정 섹션 */}
        {step === "review" || step === "saving" || step === "done" ? (
          <View style={[st.card, { gap: 12 }]}>
            <Text style={st.cardTitle}>요약</Text>
            <TextInput
              style={st.textarea}
              multiline
              value={summary}
              onChangeText={setSummary}
              placeholder="문서 요약을 확인/수정하세요."
            />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={st.cardTitle}>FAQ (질문/답변)</Text>
              <Pressable onPress={addFaq} style={[st.btnGhost, { paddingVertical: 6 }]}>
                <Text style={st.btnGhostTxt}>+ 항목 추가</Text>
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              {/* Q/A 헤더 한 번만 */}
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 2 }}>
                <Text style={[st.qaLabel, { flex: 1, minWidth: 180 }]}>Q.</Text>
                <Text style={[st.qaLabel, { flex: 1, minWidth: 180 }]}>A.</Text>
                <View style={{ width: 48 }} />
              </View>
              {faqs.map((row, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "stretch" }}>
                  <View style={{ justifyContent: "flex-start", alignItems: "center", width: 32, marginRight: 4 }}>
                    <Text style={{ fontWeight: "800", color: "#0b347a", fontSize: 18 }}>{i + 1}</Text>
                  </View>
                  <View style={[st.qaBox, { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" }]}>
                    <View style={{ gap: 6, flex: 1, minWidth: 180 }}>
                      <TextInput
                        style={st.input}
                        value={row.q ? row.q.replace(/^\d+\s*[:\.]?\s*/, "") : ""}
                        onChangeText={(v) => updateFaq(i, "q", v.replace(/^\d+\s*[:\.]?\s*/, ""))}
                        placeholder="질문을 입력하세요"
                      />
                    </View>
                    <View style={{ gap: 6, flex: 1, minWidth: 180 }}>
                      <TextInput
                        style={[st.input, { height: 72 }]}
                        multiline
                        value={row.a ? row.a.replace(/^\d+\s*[:\.]?\s*/, "") : ""}
                        onChangeText={(v) => updateFaq(i, "a", v.replace(/^\d+\s*[:\.]?\s*/, ""))}
                        placeholder="답변을 입력하세요"
                      />
                    </View>
                    <Pressable onPress={() => removeFaq(i)} style={[st.btnSm, st.btnSmGhost, { alignSelf: "flex-end", marginLeft: 8, marginTop: 0 }]}>
                      <Text style={[st.btnSmTxt, { color: "#ef4444" }]}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              {!faqs.length && (
                <Text style={{ color: "#64748b" }}>아직 항목이 없습니다. “+ 항목 추가”를 눌러 추가하세요.</Text>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <Pressable disabled={step === "saving"} onPress={resetAll} style={[st.btnGhost, step === "saving" && { opacity: 0.6 }]}>
                <Text style={st.btnGhostTxt}>초기화</Text>
              </Pressable>
              <Pressable
                disabled={step === "saving"}
                onPress={() => router.replace("/adminDashboard")}
                style={[st.btnGhost, step === "saving" && { opacity: 0.6 }]}
              >
                <Text style={st.btnGhostTxt}>취소</Text>
              </Pressable>
              <Pressable disabled={step === "saving"} onPress={handleSave} style={[st.btnDark, step === "saving" && { opacity: 0.7 }]}>
                <Text style={st.btnDarkTxt}>{step === "saving" ? "저장 중…" : "저장"}</Text>
              </Pressable>
            </View>

            {step === "done" && (
              <View style={{ marginTop: 6 }}>
                <Text style={st.ok}>저장 완료! 목록 페이지로 이동하거나 계속 편집할 수 있어요.</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <Pressable onPress={() => router.replace("/faq")} style={st.btnGhost}>
                    <Text style={st.btnGhostTxt}>FAQ 목록으로</Text>
                  </Pressable>
                  <Pressable onPress={resetAll} style={st.btnGhost}>
                    <Text style={st.btnGhostTxt}>새 문서 업로드</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { padding: 16, paddingBottom: 8, gap: 8, maxWidth: 1650, alignSelf: "center" }, // 1100 → 1650
  title: { fontSize: 20, fontWeight: "800", color: "#0b347a" },
  stepRow: { flexDirection: "row", gap: 8, alignItems: "center" },

  container: { padding: 16, gap: 16, maxWidth: 1650, alignSelf: "center" }, // 1100 → 1650

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    boxShadow: "0 6px 16px rgba(0,0,0,.05)",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0b347a", marginBottom: 8 },

  drop: {
    height: 240,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fafbff",
  },
  arrow: { fontSize: 28, color: "#94a3b8" },
  dropTitle: { fontWeight: "800", color: "#334155" },
  dropSub: { fontSize: 12, color: "#94a3b8" },

  btnDark: { backgroundColor: "#111827", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  btnDarkTxt: { color: "#fff", fontWeight: "800" },
  btnGhost: { backgroundColor: "#eef2ff", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  btnGhostTxt: { color: "#2563eb", fontWeight: "800" },

  info: { color: "#334155" },
  err: { color: "#ef4444", fontWeight: "700" },
  ok: { color: "#16a34a", fontWeight: "700" },

  textarea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  qaBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    gap: 10,
    backgroundColor: "#fbfdff",
  },
  qaLabel: { fontWeight: "800", color: "#0b347a" },

  btnSm: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: "auto" },
  btnSmGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#e5e7eb" },
  btnSmTxt: { fontSize: 12, fontWeight: "800", color: "#334155" },
});
