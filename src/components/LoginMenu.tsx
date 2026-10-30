import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const SERVERS = [
  { id: "br", name: "Brasil", ping: "24ms" },
  { id: "na", name: "América do Norte", ping: "120ms" },
  { id: "eu", name: "Europa", ping: "180ms" },
  { id: "as", name: "Ásia", ping: "290ms" },
];

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha precisa de 6+ caracteres").max(72),
  nickname: z.string().trim().max(30).optional(),
});

export function LoginGate({ children }: { children: (info: { nickname: string; server: string; logout: () => void }) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [nickname, setNickname] = useState("");
  const [server, setServer] = useState("br");
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setServer(localStorage.getItem("gs-server") ?? "br");
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setEntered(false); return; }
    supabase.from("profiles").select("nickname").eq("id", session.user.id).maybeSingle()
      .then(({ data }) => setNickname(data?.nickname ?? "Aventureiro"));
  }, [session]);

  const logout = async () => { await supabase.auth.signOut(); setEntered(false); };

  if (!ready) return <main className="min-h-screen bg-background" />;
  if (session && entered) {
    return <>{children({ nickname, server: SERVERS.find((s) => s.id === server)!.name, logout })}</>;
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      <h1 className="font-display text-5xl md:text-6xl text-primary text-center">Goblin Siege</h1>
      <p className="text-muted-foreground mt-2 mb-8">RPG de turnos automático</p>
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-6 space-y-5">
        <div>
          <div className="font-display text-lg mb-2">Servidor</div>
          <div className="grid grid-cols-2 gap-2">
            {SERVERS.map((s) => (
              <button key={s.id} type="button"
                onClick={() => { setServer(s.id); localStorage.setItem("gs-server", s.id); }}
                className={`rounded-md border-2 px-3 py-2 text-left text-sm transition ${server === s.id ? "border-primary bg-secondary" : "border-border hover:border-primary/60"}`}>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">● {s.ping}</div>
              </button>
            ))}
          </div>
        </div>
        {session ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Conectado como <span className="text-foreground font-semibold">{nickname}</span></p>
            <button onClick={() => setEntered(true)} className="w-full py-3 rounded-md bg-primary text-primary-foreground font-display text-lg">Entrar no jogo</button>
            <button onClick={logout} className="w-full py-2 rounded-md border text-sm">Sair da conta</button>
          </div>
        ) : (
          <AuthForm onDone={() => setEntered(true)} />
        )}
      </div>
    </main>
  );
}

function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse({ email, password, nickname: mode === "signup" ? nickname : undefined });
    if (!parsed.success) { setError(parsed.error.issues[0]!.message); return; }
    if (mode === "signup" && !parsed.data.nickname) { setError("Escolha um apelido"); return; }
    setBusy(true);
    const { error } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: parsed.data.email, password })
      : await supabase.auth.signUp({ email: parsed.data.email, password, options: { emailRedirectTo: window.location.origin, data: { nickname: parsed.data.nickname } } });
    setBusy(false);
    if (error) {
      setError(error.message.includes("Invalid login") ? "Email ou senha incorretos" : error.message.includes("already") ? "Esse email já tem conta" : error.message);
      return;
    }
    onDone();
  };

  const field = "w-full rounded-md border-2 border-border bg-background px-3 py-2 outline-none focus:border-primary";
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="font-display text-lg">{mode === "login" ? "Entrar" : "Criar conta"}</div>
      {mode === "signup" && (
        <input className={field} placeholder="Apelido do herói" value={nickname} maxLength={30} onChange={(e) => setNickname(e.target.value)} />
      )}
      <input className={field} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} type="password" placeholder="Senha" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button disabled={busy} className="w-full py-3 rounded-md bg-primary text-primary-foreground font-display text-lg disabled:opacity-60">
        {busy ? "..." : mode === "login" ? "Entrar no jogo" : "Criar e entrar"}
      </button>
      <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground">
        {mode === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </form>
  );
}
