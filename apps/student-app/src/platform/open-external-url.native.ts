import * as Linking from "expo-linking";

export async function openExternalUrl(url: string) {
  await Linking.openURL(url);
}
