import { Platform } from "react-native";

const localApiUrl = Platform.OS === "android" ? "http://10.0.2.2:3100" : "http://localhost:3100";

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || localApiUrl;
