import React, { useState } from "react";
import { Lock, KeyRound, ArrowRight } from "lucide-react";

interface AdminProtectedProps {
  children: React.ReactNode;
}

export const AdminProtected: React.FC<AdminProtectedProps> = ({ children }) => {
  // Verifica se já está logado na sessão atual do navegador
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("@nails_admin_auth") === "true";
  });
  
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Pega a senha configurada no seu .env
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

    if (passwordInput === adminPassword) {
      sessionStorage.setItem("@nails_admin_auth", "true");
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPasswordInput("");
    }
  };

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
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Senha de Acesso
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Digite a senha administrativa"
                className="w-full bg-[#0d0c0c] border border-zinc-900 rounded py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dec0b3]/60 focus:ring-1 focus:ring-[#dec0b3]/20 transition-all"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-rose-400 text-[11px] font-medium pt-1">
                Senha incorreta. Tente novamente.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 py-3 rounded text-xs font-semibold tracking-wider uppercase transition-all shadow-md"
          >
            <span>Entrar no Painel</span>
            <ArrowRight className="w-3.5 h-3.5" />
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