// app/(page)/faq.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";

export default function FAQScreen() {
  // 카테고리
  const categories = useMemo(
    () => [
      "인재·휴가",
      "사내 규정",
      "지원제도",
      "휴직제도",
      "복지제도",
      "휴게공간",
      "사내 시스템",
      "복장",
      "메신저 사용법",
      "급여·수당·세금",
      "근무 시간·출퇴근",
    ],
    []
  );

  // 더미 질문 데이터 (카테고리별)
  const allQuestions = useMemo(
    () => ({
      "인재·휴가": [
        "연차 쓰려면 누구한테 말해야 하나요?",
        "연차는 며칠 전까지 내야 하나요?",
        "입사한 지 얼마 안 됐는데 연차가 있나요?",
        "지각 처리 기준은 어떻게 되나요?",
        "연차 신청은 어디서 하나요?",
        "반차도 미리 신청해야 하나요?",
        "대체휴무는 어떻게 쓰나요?",
        "병가 규정이 궁금해요",
      ],
      "사내 규정": [
        "사내 보안 정책 요약이 있나요?",
        "야근 식대 기준은 어떻게 돼요?",
        "외부 반출 장비 승인 절차는?",
        "협력사 출입증은 어떻게 신청하나요?",
      ],
      "지원제도": [
        "교육비 지원 한도가 있나요?",
        "자격증 취득 지원금 신청 방법",
        "사내 도서구매 지원 안내",
      ],
      "휴직제도": [
        "육아휴직 신청 시기와 방법",
        "질병 휴직은 최대 몇 개월까지 가능한가요?",
      ],
      "복지제도": [
        "사내 카페 이용 가이드",
        "명절 선물 지급 기준",
        "통근버스 노선표가 궁금해요",
        "건강검진 지원 범위",
      ],
      "휴게공간": ["회의실/포커스룸 예약 방법", "라커 이용 수칙", "흡연 구역 위치가 어딘가요?"],
      "사내 시스템": [
        "VPN 접속 오류 해결",
        "메일 용량 초과 시 조치",
        "SSO 비밀번호 초기화 방법",
        "전자결재 결재선 추가 방법",
      ],
      복장: ["드레스코드가 있나요?", "캐주얼데이 요일이 정해져 있나요?"],
      "메신저 사용법": ["채널 만드는 법", "파일 업로드 제한", "상단 고정 기능"],
      "급여·수당·세금": [
        "경조사 지원금 신청",
        "연말정산 제출 서류",
        "성과급 지급 시기",
        "교통비는 어디서 신청하나요?",
      ],
      "근무 시간·출퇴근": [
        "탄력근무 신청 절차",
        "지각 처리 기준",
        "재택근무 신청 방법",
        "출장 시 근무시간 산정",
      ],
    }),
    []
  );

  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 7;

  // 검색/필터링
  const filtered = useMemo(() => {
    const base = allQuestions[activeCategory] || [];
    const q = query.trim();
    if (q.length === 0) return base;
    // 2글자 이상일 때만 검색 결과 표시
    if (q.length < 2) return [];
    return base.filter((t) => t.toLowerCase().includes(q.toLowerCase()));
  }, [allQuestions, activeCategory, query]);

  // 페이징
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageSlice = filtered.slice(
    (pageClamped - 1) * PAGE_SIZE,
    pageClamped * PAGE_SIZE
  );

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // 검색 안내 메시지
  const showNoResult =
    query.trim().length >= 2 && filtered.length === 0;
  const showTypeMore =
    query.trim().length > 0 && query.trim().length < 2;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container}>
        {/* 검색 영역 */}
        <View style={s.searchCard}>
          <Text style={s.searchTitle}>질문을 입력하세요.</Text>
          <View style={s.searchRow}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="검색어를 입력하세요"
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setPage(1);
              }}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>

          {showTypeMore && (
            <Text style={s.helperText}>
              검색 결과가 없습니다. 2자 이상 입력해주세요.
            </Text>
          )}
          {showNoResult && (
            <Text style={s.helperText}>
              검색 결과가 없습니다. 다른 검색어를 입력해 주세요.
            </Text>
          )}
        </View>

        <View style={s.bodyRow}>
          {/* 카테고리 */}
          <View style={s.categoryCol}>
            {categories.map((c) => {
              const active = c === activeCategory;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    setActiveCategory(c);
                    setPage(1);
                  }}
                  style={[s.catBtn, active && s.catBtnActive]}
                  activeOpacity={0.9}
                >
                  <Text style={[s.catText, active && s.catTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 질문 TOP / 결과 리스트 */}
          <View style={s.listCol}>
            <Text style={s.sectionTitle}>질문 TOP</Text>
            <View style={s.qaList}>
              {(pageSlice.length ? pageSlice : (query.trim() ? [] : (allQuestions[activeCategory] || []).slice(0, PAGE_SIZE))).map(
                (q, idx) => (
                  <TouchableOpacity key={`${q}-${idx}`} style={s.qaRow} activeOpacity={0.9}>
                    <Text style={s.qIcon}>Q</Text>
                    <Text style={s.qText} numberOfLines={1}>{q}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* 하단 페이징 */}
            <View style={s.pagingWrap}>
              <TouchableOpacity
                onPress={goPrev}
                disabled={pageClamped === 1}
                style={[s.pageBtn, pageClamped === 1 && s.pageBtnDisabled]}
              >
                <Text style={s.pageBtnTxt}>‹</Text>
              </TouchableOpacity>

              {[...Array(totalPages)].map((_, i) => {
                const n = i + 1;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setPage(n)}
                    style={[s.pageNum, n === pageClamped && s.pageNumActive]}
                  >
                    <Text style={[s.pageNumTxt, n === pageClamped && s.pageNumTxtActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={goNext}
                disabled={pageClamped === totalPages}
                style={[s.pageBtn, pageClamped === totalPages && s.pageBtnDisabled]}
              >
                <Text style={s.pageBtnTxt}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  web: { boxShadow: "0px 2px 10px rgba(0,0,0,0.05)" }, // RN Web 권장
  default: {
    // 네이티브(ios/android) 전용 그림자
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f9fc" },
  container: { padding: 16, gap: 12 },

  // 검색 카드
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    ...cardShadow,
  },
  searchTitle: { fontSize: 13, color: "#6b7280", marginBottom: 10 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: { marginRight: 6, fontSize: 16, color: "#6b7280" },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  helperText: { marginTop: 8, fontSize: 12, color: "#9ca3af" },

  // 본문 2열
  bodyRow: { flexDirection: "row", gap: 12 },
  categoryCol: {
    width: 120,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    ...cardShadow,
  },
  listCol: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    ...cardShadow,
  },

  // 카테고리 버튼
  catBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
  },
  catBtnActive: { backgroundColor: "#e6f0ff" },
  catText: { fontSize: 13, color: "#374151" },
  catTextActive: { color: "#2563eb", fontWeight: "700" },

  // 리스트
  sectionTitle: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
    marginBottom: 8,
  },
  qaList: { gap: 8 },
  qaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f9ff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  qIcon: {
    width: 20,
    textAlign: "center",
    marginRight: 8,
    color: "#2563eb",
    fontWeight: "900",
  },
  qText: { flex: 1, color: "#1f2937", fontSize: 14 },

  // 페이징
  pagingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnTxt: { color: "#374151", fontSize: 16, fontWeight: "700" },
  pageNum: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  pageNumActive: { backgroundColor: "#2563eb22" },
  pageNumTxt: { color: "#111827" },
  pageNumTxtActive: { color: "#2563eb", fontWeight: "800" },
});
