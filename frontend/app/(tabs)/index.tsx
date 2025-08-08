// app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
  // 루트 진입 시 곧바로 /domain 으로 이동
  return <Redirect href="/domain" />;
}
