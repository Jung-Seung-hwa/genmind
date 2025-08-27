import React, { useEffect } from "react";
import { View, Text } from "react-native";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

function getWebUrl() {
  const host = (Constants.expoConfig?.hostUri || "").split(":")[0];
  return host ? `http://${host}:8081/adminDashboard` : "http://localhost:8081/adminDashboard";
}

export default function AdminDashboardNative() {
  useEffect(() => { Linking.openURL(getWebUrl()); }, []);
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
      <Text>관리자 대시보드를 브라우저에서 열고 있어요…</Text>
    </View>
  );
}
