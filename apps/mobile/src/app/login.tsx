import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/auth-context";
import { NexoraTheme } from "../contexts/theme-context";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.brandName}>Nexora</Text>
          <Text style={styles.slogan}>Gestão que impulsiona.</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={NexoraTheme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={NexoraTheme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/signup")}
            disabled={loading}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NexoraTheme.colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: NexoraTheme.colors.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  brandName: {
    fontSize: 28,
    fontWeight: "700",
    color: NexoraTheme.colors.dark,
  },
  slogan: {
    fontSize: 14,
    color: NexoraTheme.colors.textSecondary,
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: NexoraTheme.colors.border,
    borderRadius: NexoraTheme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: NexoraTheme.colors.text,
  },
  button: {
    backgroundColor: NexoraTheme.colors.blue,
    borderRadius: NexoraTheme.radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  linkText: {
    color: NexoraTheme.colors.blue,
    fontSize: 14,
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 3,
    borderLeftColor: NexoraTheme.colors.error,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: NexoraTheme.colors.error,
    fontSize: 13,
  },
});