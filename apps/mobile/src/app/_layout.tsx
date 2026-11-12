import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../contexts/auth-context";
import { ThemeProvider } from "../contexts/theme-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function RootLayoutInner() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return null; // Splash screen handles this
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F8FAFF" },
      }}
    >
      {!session ? (
        <Stack.Screen name="login" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
      <Stack.Screen name="select-org" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootLayoutInner />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}