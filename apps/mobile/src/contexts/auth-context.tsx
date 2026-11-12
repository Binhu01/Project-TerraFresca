import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface Membership {
  id: string;
  organization_id: string;
  role: string;
  status: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  memberships: Membership[];
  activeOrgId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  setActiveOrg: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedForUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadMemberships(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadMemberships(session.user.id);
      } else {
        setMemberships([]);
        setActiveOrgId(null);
        loadedForUserId.current = null;
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMemberships(userId: string) {
    // Guard against redundant calls for the same user
    if (loadedForUserId.current === userId) return;
    loadedForUserId.current = userId;

    const { data } = await supabase
      .from("memberships")
      .select("id, organization_id, role, status")
      .eq("user_id", userId)
      .eq("status", "active");

    const mems = (data ?? []) as Membership[];
    setMemberships(mems);

    if (mems.length > 0 && !activeOrgId) {
      setActiveOrgId(mems[0].organization_id);
    }
    setIsLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMemberships([]);
    setActiveOrgId(null);
    loadedForUserId.current = null;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        memberships,
        activeOrgId,
        isLoading,
        signIn,
        signUp,
        signOut,
        setActiveOrg: setActiveOrgId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}