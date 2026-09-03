import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRAND = "#ff4800";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const emailInvalid = submitted && !EMAIL_REGEX.test(email.trim());
  const passwordInvalid = submitted && password.length < 6;

  function handleSubmit() {
    setSubmitted(true);

    const validEmail = EMAIL_REGEX.test(email.trim());
    const validPassword = password.length >= 6;
    if (!validEmail || !validPassword) return;

    // TODO: trocar pelo adaptador de sessão nativa quando o slice de auth chegar.
    router.replace("/aluno");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safeArea.backgroundColor} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Image
              source={require("../../../assets/app-do-sensei-logo.png")}
              accessibilityLabel="App do Sensei"
              resizeMode="contain"
              style={styles.logo}
            />

            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Entre para continuar seus treinos.</Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text nativeID="email-label" style={styles.label}>
                  E-mail
                </Text>
                <TextInput
                  accessibilityLabel="E-mail"
                  accessibilityLabelledBy="email-label"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="voce@email.com"
                  placeholderTextColor="#77777f"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  style={[styles.input, emailInvalid && styles.inputInvalid]}
                />
                {emailInvalid ? <Text style={styles.error}>Informe um e-mail válido.</Text> : null}
              </View>

              <View style={styles.field}>
                <Text nativeID="password-label" style={styles.label}>
                  Senha
                </Text>
                <TextInput
                  accessibilityLabel="Senha"
                  accessibilityLabelledBy="password-label"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#77777f"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  style={[styles.input, passwordInvalid && styles.inputInvalid]}
                />
                {passwordInvalid ? (
                  <Text style={styles.error}>A senha deve ter ao menos 6 caracteres.</Text>
                ) : null}
              </View>

              <View style={styles.optionsRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel="Lembrar-me"
                  accessibilityState={{ checked: rememberMe }}
                  hitSlop={8}
                  onPress={() => setRememberMe((current) => !current)}
                  style={styles.rememberButton}
                >
                  <View style={[styles.checkbox, !rememberMe && styles.checkboxUnchecked]}>
                    {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.optionText}>Lembrar-me</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push("/pre-cadastro")}
                >
                  <Text style={styles.forgotPassword}>Esqueci a senha</Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                ]}
              >
                <Text style={styles.submitText}>Entrar</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não tem conta? </Text>
            <Link href="/pre-cadastro" style={styles.createAccount}>
              Criar conta
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f7f7" },
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 65, paddingBottom: 15 },
  logo: { width: 61, height: 65 },
  title: {
    marginTop: 22,
    color: "#1d1d20",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.7,
    lineHeight: 37,
  },
  subtitle: { marginTop: 1, color: "#77777f", fontSize: 15, lineHeight: 22 },
  form: { marginTop: 28 },
  field: { marginBottom: 17 },
  label: {
    marginBottom: 7,
    color: "#242427",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 18,
  },
  input: {
    height: 49,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    color: "#242427",
    fontSize: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 3,
    elevation: 3,
  },
  inputInvalid: { borderColor: "#c52d2d" },
  error: { marginTop: 5, color: "#c52d2d", fontSize: 12 },
  optionsRow: {
    minHeight: 27,
    marginTop: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rememberButton: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
  },
  checkboxUnchecked: {
    borderWidth: 1,
    borderColor: "#c9c9cc",
    backgroundColor: "transparent",
  },
  checkmark: {
    marginTop: -1,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 21,
  },
  optionText: { marginLeft: 8, color: "#2b2b2f", fontSize: 15 },
  forgotPassword: { color: "#2b2b2f", fontSize: 14, fontWeight: "500" },
  submitButton: {
    height: 49,
    marginTop: 17,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
  },
  submitButtonPressed: { opacity: 0.84 },
  submitText: { color: "#ffffff", fontSize: 16, fontWeight: "500" },
  footer: {
    marginTop: "auto",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { color: "#77777f", fontSize: 14 },
  createAccount: { color: "#dc3f00", fontSize: 14, fontWeight: "600" },
});
