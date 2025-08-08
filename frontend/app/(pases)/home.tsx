// app/(pages)/home.tsx
import React, { useState } from "react";
import { View, Text, Button, StyleSheet, Platform, ActivityIndicator } from "react-native";
import Constants from "expo-constants";

export default function HomeScreen() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // 1) app.json의 expo.extra.FASTAPI_BASE 우선 사용
  // 2) 없으면 에뮬레이터/플랫폼별 기본값 사용
  const EXTRA = (Constants.expoConfig?.extra as any) ?? {};
  const FASTAPI_BASE =
    EXTRA.FASTAPI_BASE ??
    (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000");

  const callFastAPI = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    setLoading(true);
    setResponse("");

    try {
      const url = `${FASTAPI_BASE}/chat?q=${encodeURIComponent("테스트")}`;
      console.log("[REQ] GET", url);

      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
      }

      const json = await res.json();
      console.log("[RES]", json);
      setResponse(String(json?.answer ?? "응답 없음"));
    } catch (err: any) {
      const msg = err?.name === "AbortError" ? "요청 시간 초과" : err?.message || "알 수 없는 에러";
      setResponse(`에러 발생: ${msg}`);
      console.error("[ERR]", err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title={loading ? "요청 중..." : "FastAPI 호출"} onPress={callFastAPI} disabled={loading} />
      <View style={styles.resultWrap}>
        {loading ? <ActivityIndicator /> : <Text style={styles.resultText}>{response || "결과가 여기 표시됩니다."}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  resultWrap: { marginTop: 20, minHeight: 30, justifyContent: "center" },
  resultText: { fontSize: 16 },
});
