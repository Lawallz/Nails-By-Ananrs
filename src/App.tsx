import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { HomeView } from "./components/HomeView";
import { ServicesView } from "./components/ServicesView";
import { PortfolioView } from "./components/PortfolioView";
import { AIStylistView } from "./components/AIStylistView";
import { BookingWizard } from "./components/BookingWizard";
import { AdminView } from "./components/AdminView";
import { AdminProtected } from "./components/AdminProtected"; // <-- Componente de proteção com senha
import { Sparkles, Calendar, Heart, ShieldAlert, Award, FileText, CheckCircle2, Phone, Smile, Lock } from "lucide-react";
import { Service, Booking } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("inicio");
  const [preselectedService, setPreselectedService] = useState<Service | null>(null);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Verifica se o caminho atual da URL é /admin
  const isAdminRoute = window.location.pathname === "/admin";

  const loadPastBookings = () => {
    try {
      const stored = localStorage.getItem("luxenail_bookings");
      if (stored) {
        setPastBookings(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Local storage loadings failed:", err);
    }
  };

  useEffect(() => {
    loadPastBookings();
  }, []);

  const handleOpenBookingTab = () => {
    setPreselectedService(null);
    setActiveTab("agendar");
  };

  const clearPastBookings = () => {
    try {
      localStorage.removeItem("luxenail_bookings");
      setPastBookings([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Se a rota for /admin, renderiza o painel protegido por senha
  if (isAdminRoute) {
    return (
      <AdminProtected>
        <div className="min-h-screen bg-[#0b0a0a] text-zinc-100 flex flex-col justify-between">
          <header className="bg-zinc-950 border-b border-zinc-900 px-6 py-4 flex justify-between items-center">
            <span className="font-serif text-sm tracking-widest text-[#dec0b3] uppercase">Nails By Ananrs • Admin</span>
            <a href="/" className="text-xs text-zinc-400 hover:text-white transition-colors underline">Voltar para o Site</a>
          </header>
          <main className="flex-grow">
            <AdminView />
          </main>
          <footer className="bg-zinc-950 border-t border-zinc-900 py-4 text-center text-xs text-zinc-600">
            Painel de Controle Restrito
          </footer>
        </div>
      </AdminProtected>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0a0a] text-zinc-150 flex flex-col justify-between" id="app-root-container">
      
      {/* Top Level Sticky Blur Navbar */}
      <Navbar 
        activeTab={activeTab === "agendar" ? "" : activeTab} 
        setActiveTab={setActiveTab} 
        onOpenBooking={handleOpenBookingTab}
      />

      {/* Main Screen Active Panel Wrapper with soft entrance fading */}
      <main className="flex-grow pt-4">
        {activeTab === "inicio" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <HomeView 
              onGoToServices={() => setActiveTab("servicos")}
              onGoToStylist={() => setActiveTab("ai-stylist")}
              onGoToBooking={handleOpenBookingTab}
            />
          </div>
        )}

        {activeTab === "servicos" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ServicesView 
              onSelectServiceForBooking={(service) => {
                setPreselectedService(service);
                setActiveTab("agendar");
              }}
              onGoToStylist={() => setActiveTab("ai-stylist")}
            />
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <PortfolioView 
              onGoToBooking={handleOpenBookingTab}
              onGoToStylist={() => setActiveTab("ai-stylist")}
            />
          </div>
        )}

        {activeTab === "ai-stylist" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <AIStylistView 
              onBookService={(service) => {
                setPreselectedService(service);
                setActiveTab("agendar");
              }}
            />
          </div>
        )}

        {activeTab === "agendar" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <BookingWizard 
              preselectedService={preselectedService}
              onClearPreselectedService={() => setPreselectedService(null)}
              onBookingSuccess={() => {
                loadPastBookings();
              }}
            />
          </div>
        )}
      </main>

      {/* Accordion panel block: Local agenda records history log */}
      {pastBookings.length > 0 && (
        <section className="bg-zinc-950 border-t border-zinc-900 py-6 text-zinc-400 select-none" id="app-bookings-history-section">
          <div className="max-w-4xl mx-auto px-4 z-40">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                id="app-btn-history-toggle"
                className="flex items-center gap-2.5 text-xs font-semibold tracking-wider text-white uppercase bg-zinc-900 hover:bg-zinc-850 px-5 py-2.5 rounded border border-zinc-850 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#e0c56e]" />
                {showHistory ? "Fechar Meus Agendamentos Recentes" : `Visualizar Meus Agendamentos (${pastBookings.length})`}
              </button>

              {showHistory && (
                <button 
                  onClick={clearPastBookings}
                  id="app-btn-history-clear"
                  className="text-zinc-600 hover:text-red-400 text-[10px] tracking-wide uppercase transition-colors"
                >
                  Limpar Histórico Recente
                </button>
              )}
            </div>

            {showHistory && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300" id="past-bookings-list">
                {pastBookings.map((b) => (
                  <div key={b.id} id={`past-booking-card-${b.id}`} className="p-4 rounded border border-zinc-900 bg-[#0c0b0b] space-y-3.5">
                    <div className="flex justify-between items-start border-b border-zinc-950 pb-2">
                      <div className="text-left">
                        <span className="text-[9px] text-zinc-500 tracking-wider block uppercase">Procedimento Agendado</span>
                        <h5 className="font-serif text-white font-medium text-sm truncate max-w-[200px]">{b.serviceName}</h5>
                      </div>
                      <span className="font-mono text-[10px] bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-[#e0c56e] font-bold">
                        #{b.id}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-sans text-left">
                      <div>
                        <span className="text-zinc-500 block">Horário</span>
                        <span className="text-zinc-300 font-semibold">{b.time}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Preço</span>
                        <span className="text-zinc-300 font-semibold">R$ {b.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Ultra elegant minimalist footer branding block */}
      <footer className="bg-zinc-980 py-8 border-t border-zinc-950/60" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 text-xs font-light tracking-wide text-zinc-600">
          <div className="flex items-center justify-center gap-2 text-zinc-500 font-serif text-sm">
            <span>© 2026 Nails By Ananrs.</span>
            <span>•</span>
            <span className="text-[#e2c56f]">Artistry in Every Detail.</span>
          </div>
          <p className="max-w-lg mx-auto leading-relaxed">
            Desenvolvido com sofisticação. Nossa biossegurança de autoclaves protege o seu estilo de vida enquanto restauramos e adornamos a beleza de suas mãos.
          </p>
          {/* Link discreto para a Ana acessar o painel administrativo */}
          <div className="pt-2">
            <a 
              href="/admin" 
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-700 hover:text-[#dec0b3] transition-colors"
            >
              <Lock className="w-3 h-3" /> Acesso Administrativo (Ana)
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}