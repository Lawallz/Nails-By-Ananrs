import React, { useState, useEffect } from "react";
import { Lock, KeyRound, Mail, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente do Supabase usando as chaves públicas normais
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AdminProtectedProps {
  children: React.ReactNode;
}

export const AdminProtected: React.FC<AdminProtectedProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Se preferir fixar o e-mail do admin, pode deixar aqui. Ou alterar para o usuário digitar.
  const [emailInput, setEmailInput] = useState("admin@nailsbyananrs.com");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Verifica se já existe uma sessão ativa no Supabase ao carregar a página
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      }
      setLoading(false);
    });

    // Escuta mudanças de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "E-mail ou senha incorretos.");
      setPasswordInput("");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0c0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#dec0b3] animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0d0c0c] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 p-8 rounded shadow-2xl space-y-6 text-left">
        
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-full bg-[#dec0b3]/10 border border-[#dec0b3]/20 flex items-center justify-center mx-auto text-[#dec0b3]">
          <Lock className="w-5 h-5" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-serif text-white font-medium">Área Restrita</h2>
          <p className="text-zinc-400 text-xs">
            Painel de Gestão Exclusivo • Nails by Ananrs
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Campo de E-mail */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              E-mail de Administrador
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@seuemail.com"
                required
                className="w-full bg-[#0d0c0c] border border-zinc-900 rounded py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dec0b3]/60 focus:ring-1 focus:ring-[#dec0b3]/20 transition-all"
              />
            </div>
          </div>

          {/* Campo de Senha */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Senha de Acesso
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite sua senha segura"
                required
                className="w-full bg-[#0d0c0c] border border-zinc-900 rounded py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dec0b3]/60 focus:ring-1 focus:ring-[#dec0b3]/20 transition-all"
                autoFocus
              />
            </div>
            {errorMessage && (
              <p className="text-rose-400 text-[11px] font-medium pt-1">
                Credenciais inválidas. Verifique os dados.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 py-3 rounded text-xs font-semibold tracking-wider uppercase transition-all shadow-md disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center border-t border-zinc-900/60 pt-4">
          <a
            href="/"
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider"
          >
            ← Voltar para o site principal
          </a>
        </div>

      </div>
    </div>
  );
};