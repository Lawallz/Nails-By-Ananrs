import React, { useState } from "react";
import { Menu, X, Calendar, Instagram } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenBooking: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenBooking }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "inicio", label: "Início" },
    { id: "servicos", label: "Serviços" },
    { id: "portfolio", label: "Portfólio" },
    { id: "ai-stylist", label: "Consultor AI" },
  ];

  const instagramUrl = "https://www.instagram.com/nailsby.ananrs"; 

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0b0a0a]/80 backdrop-blur-md backdrop-filter border-b border-zinc-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Brand Link */}
          <div 
            onClick={() => setActiveTab("inicio")} 
            className="flex items-center gap-3 cursor-pointer group"
            id="nav-logo"
          >
            <div className="h-20 sm:h-24 w-auto flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <img 
                src="logo.png" 
                alt="Ana Nail Designer Logo" 
                className="h-full w-auto object-contain select-none max-w-[180px] sm:max-w-[240px]" 
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8" id="nav-desktop-menu">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`relative text-sm tracking-wide transition-colors duration-300 py-1 ${
                  activeTab === item.id
                    ? "text-[#dec0b3]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {item.label}
                {activeTab === item.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#dec0b3] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* CTA & Social Desktop */}
          <div className="hidden md:flex items-center gap-5">
            {/* Ícone Instagram */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-[#dec0b3] transition-colors duration-300"
              aria-label="Siga-nos no Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>

            {/* Botão de Agendamento */}
            <button
               id="nav-btn-booking"
               onClick={onOpenBooking}
               className="flex items-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 font-medium text-xs tracking-wider uppercase py-2.5 px-6 rounded-sm transition-all duration-300 transform active:scale-95 shadow-lg shadow-[#dec0b3]/10"
            >
              <Calendar className="w-3.5 h-3.5" />
              Agendar Agora
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              id="nav-mobile-hamburger"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              aria-label="Menu principal"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Draw Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-[#0e0d0d]/95 backdrop-blur-lg backdrop-filter border-b border-zinc-900 px-4 pt-2 pb-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300" id="nav-mobile-dropdown">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`nav-mobile-item-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-[#dec0b3]/10 text-[#dec0b3] border-l-2 border-[#dec0b3]"
                    : "text-zinc-300 hover:bg-zinc-900/50 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          
          {/* Ações Mobile: Agendamento e Link Social */}
          <div className="pt-4 border-t border-zinc-900/60 space-y-3">
            <button
              id="nav-mobile-btn-booking"
              onClick={() => {
                onOpenBooking();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#dec0b3] text-zinc-950 font-semibold py-3 px-4 rounded-md uppercase tracking-wider text-xs transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Agendar Horário
            </button>

            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 border border-zinc-800 bg-zinc-950 text-zinc-300 font-medium py-3 px-4 rounded-md text-xs tracking-wider uppercase hover:text-white hover:border-zinc-700 transition-colors"
            >
              <Instagram className="w-4 h-4 text-[#dec0b3]" />
              Siga no Instagram
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};