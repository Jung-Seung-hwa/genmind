// app/index.js
import { Redirect } from "expo-router";

export default function Index() {
  // 앱 처음 켤 때 바로 /domain으로 이동
  return <Redirect href="/domain" />;
}
