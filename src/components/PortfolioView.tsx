import React from "react";
import { Sparkles, Calendar, Heart, ShieldAlert, BadgeCheck } from "lucide-react";
import { PORTFOLIO, SERVICES } from "../data";

interface PortfolioViewProps {
  onGoToBooking: () => void;
  onGoToStylist: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onGoToBooking, onGoToStylist }) => {
  // Let's take a subset of services to show as top capsules like in Screen 3
  const premiumShowcase = [
    {
      name: "Alongamento em Gel",
      desc: "Durabilidade, brilho vítreo and naturalidade em gel.",
      img: SERVICES.find(s => s.id === "alongamento-gel")?.image || ""
    },
    {
      name: "Fibra de Vidro",
      desc: "Resistência estrutural extrema para unhas finas.",
      img: SERVICES.find(s => s.id === "fibra-vidro")?.image || ""
    },
    {
      name: "Blindagem de Unhas",
      desc: "Escudo rígido protetor para crescer saudável.",
      img: SERVICES.find(s => s.id === "blindagem-unhas")?.image || ""
    },
    {
      name: "Esmaltação em Gel",
      desc: "Acabamento brilhante impecável por 3 semanas.",
      img: SERVICES.find(s => s.id === "esmaltacao-gel")?.image || ""
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-20 text-left" id="portfolio-view-container">
      
      {/* 1. Header and Premium Row Showcase similar to Screen 3 */}
      <div className="space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#dec0b3] block">Artesanato e Simetria</span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white uppercase font-light tracking-tight">
            Nossos Serviços <span className="text-gold-gradient italic font-normal">e Arte</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Técnicas contemporâneas meticulosamente refinadas para esculpir e dar brilho à sua verdadeira essência de beleza.
          </p>
          <div className="w-16 h-[1.5px] bg-[#dec0b3]/40 mx-auto mt-2"></div>
        </div>

        {/* Categories Grid as shown at the top of Screen 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="portfolio-category-showcase">
          {premiumShowcase.map((item, index) => (
            <div 
              key={index}
              className="group relative h-40 rounded border border-zinc-900 overflow-hidden bg-zinc-950/60 shadow-lg cursor-pointer flex flex-col justify-end p-5 transition-all duration-300 hover:border-[#dec0b3]/30"
              onClick={onGoToBooking}
            >
              <div className="absolute inset-0 z-0">
                <img 
                  src={item.img} 
                  alt={item.name}
                  className="w-full h-full object-cover opacity-35 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 select-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              </div>
              <div className="relative z-10 space-y-1 text-left">
                <h3 className="font-serif text-lg tracking-wide text-white group-hover:text-[#dec0b3] transition-colors">
                  {item.name}
                </h3>
                <p className="text-[11px] text-zinc-400 leading-snug group-hover:text-zinc-300 transition-colors font-light">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Special Custom art Card with icon */}
          <div 
            id="portfolio-custom-art-card"
            onClick={onGoToStylist}
            className="group rounded border border-dashed border-[#dec0b3]/40 bg-[#161413]/40 p-5 flex flex-col justify-between hover:border-[#dec0b3] hover:bg-[#1c1917]/50 transition-all duration-300 cursor-pointer"
          >
            <div className="p-2 w-fit rounded bg-zinc-900 border border-[#dec0b3]/20 text-[#dec0b3]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left space-y-1">
              <span className="text-[9px] tracking-widest text-[#dec0b3] uppercase font-bold">Arte Customizada</span>
              <h3 className="font-serif text-lg tracking-wide text-white">Nail Art Exclusiva</h3>
              <p className="text-[10px] text-zinc-400 leading-snug font-light">
                Consulte nosso consultor de design inteligente AI para sugerir novas tendências autorais.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual Grayscale-to-Color Portfolio Showcase (Bottom Grid Screen 3) */}
      <div className="space-y-8 border-t border-zinc-950 pt-16">
        <div className="text-left space-y-1.5">
          <span className="text-[10px] tracking-[0.25em] text-[#dec0b3] uppercase font-semibold">Galeria de Resultados</span>
          <h2 className="text-2xl sm:text-3xl font-serif text-white uppercase font-light">
            Realismo & <span className="text-gold-gradient italic font-normal">Perfeição em Zoom</span>
          </h2>
          <p className="text-zinc-500 text-xs font-light max-w-xl">
            Passando o ponteiro sobre cada obra, assista ao surgimento da pigmentação perfeita, esmaltações sem bolhas ou excessos e acabamento de alta fidelidade Nails by Ananrs.
          </p>
        </div>

        {/* 4 elements catalog list corresponding to the lower screenshots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="portfolio-main-grid">
          {PORTFOLIO.map((item) => (
            <div 
              key={item.id}
              id={`portfolio-item-box-${item.id}`}
              className="bg-[#0c0b0b] rounded-sm overflow-hidden border border-zinc-900 group shadow-xl hover:border-zinc-800 transition-colors duration-300"
            >
              
              {/* Image Frame */}
              <div className="relative aspect-[4/5] bg-zinc-950 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover portfolio-hover-img select-none"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating zoom badge */}
                <div className="absolute top-3 right-3 bg-zinc-950/80 border border-zinc-900 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <BadgeCheck className="w-4 h-4 text-[#dec0b3]" />
                </div>
              </div>

              {/* Descriptions underneath */}
              <div className="p-5 space-y-1 text-left">
                <h4 className="font-serif text-white text-base tracking-wide group-hover:text-[#dec0b3] transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-light font-sans line-clamp-2">
                  {item.description}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* 3. Custom conversion block */}
      <section className="bg-gradient-to-r from-zinc-950 to-zinc-900/40 p-8 sm:p-10 rounded border border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-6" id="portfolio-footer-callout">
        <div className="text-left space-y-1.5 max-w-lg">
          <h4 className="text-lg font-serif text-white">Inspirada para redefinir as suas mãos?</h4>
          <p className="text-zinc-400 text-xs font-light leading-relaxed">
            Assegure um momento de autocuidado exclusivo. Oferecemos agendamento simplificado com suporte ao cliente rápido no WhatsApp após a conclusão técnica em tela.
          </p>
        </div>
        <button
          id="portfolio-cta-btn-book"
          onClick={onGoToBooking}
          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 font-semibold uppercase text-xs tracking-wider py-3.5 px-8 rounded-sm transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          Prender um Horário
        </button>
      </section>

    </div>
  );
};