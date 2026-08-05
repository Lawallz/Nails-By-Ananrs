import React from "react";
import { ShieldCheck, Sparkles, Heart, Coffee, Instagram, ArrowRight } from "lucide-react";
import { CONCEPT_HERO_IMAGE, CONCEPT_INTERIOR_IMAGE } from "../data";

interface HomeViewProps {
  onGoToServices: () => void;
  onGoToStylist: () => void;
  onGoToBooking: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onGoToServices, onGoToStylist, onGoToBooking }) => {
  return (
    <div className="space-y-24 pb-20 overflow-x-hidden" id="home-view-container">
      
      {/* 1. Hero Concept Section */}
      <section className="relative pt-12 lg:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-6 space-y-8 text-left" id="hero-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-[#dec0b3]/20 bg-[#161413]/60 text-xs tracking-[0.15em] text-[#dec0b3] uppercase border">
                <Sparkles className="w-3.5 h-3.5" />
                Alto Padrão em Nail Design
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight leading-none text-white font-light">
                Unhas Impecáveis, <br />
                <span className="text-gold-gradient font-normal">Exclusivas</span> e que <br />
                Duram Mais
              </h1>
              
              <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl">
                A arte da nail design elevada ao nível de luxo e sofisticação. Unhas meticulosamente esculpidas para complementar a sua autoconfiança de forma sublime, utilizando componentes de alta resistência e acabamento vítreo perfeito.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  id="hero-btn-book"
                  onClick={onGoToBooking}
                  className="flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 px-8 py-3.5 font-semibold text-xs tracking-wider uppercase rounded-sm transition-all duration-300 transform active:scale-95"
                >
                  Agendar Horário
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  id="hero-btn-services"
                  onClick={onGoToServices}
                  className="flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-950/50 text-white px-8 py-3.5 font-medium text-xs tracking-wider uppercase rounded-sm transition-colors duration-300"
                >
                  Ver Serviços
                </button>
              </div>

              {/* Instant dynamic style helper promotion */}
              <div 
                id="hero-ai-match-promo"
                onClick={onGoToStylist}
                className="p-4 rounded border border-zinc-900 bg-zinc-950/40 hover:bg-[#161413]/40 cursor-pointer transition-colors duration-300 flex items-center justify-between group max-w-xl"
              >
                <div>
                  <h4 className="text-xs font-semibold text-white tracking-wider uppercase mb-1 flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Não sabe qual procedimento escolher?
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Nossa inteligência artificial analisa suas unhas e indica o procedimento ideal.
                  </p>
                </div>
                <div className="text-[#dec0b3] text-xs font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Consultar AI
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

            </div>

            {/* Hero Right Image Box */}
            <div className="lg:col-span-6 relative flex justify-center" id="hero-right">
              <div className="relative w-full max-w-md lg:max-w-none antialiased">
                
                {/* Gold Frame border effect */}
                <div className="absolute -inset-3 rounded-md border border-[#dec0b3]/15 pointer-events-none scale-95 hover:scale-100 transition-transform duration-700"></div>
                
                {/* Main image */}
                <div className="aspect-[4/5] w-full rounded-sm overflow-hidden bg-zinc-900 border border-zinc-950/50 relative shadow-2xl">
                  <img
                    src={CONCEPT_HERO_IMAGE}
                    alt="LuxeNail Design"
                    className="w-full h-full object-cover select-none relative z-10 hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none"></div>
                </div>

                {/* Floating Quote Box */}
                <div className="absolute -bottom-6 -left-6 sm:bottom-8 sm:-left-8 z-20 bg-[#0e0d0d] border border-zinc-900 p-4 sm:p-5 rounded-sm max-w-[190px] shadow-2xl" id="quote-overlay-card">
                  <span className="text-[#dec0b3] text-2xl font-serif italic block mb-1">“</span>
                  <p className="text-sm tracking-wide text-zinc-100 italic leading-snug font-serif">
                    Perfeição é um hábito, não um ato fortuito.
                  </p>
                  <p className="text-[9px] tracking-[0.2em] text-[#dec0b3] uppercase mt-2.5 font-bold">
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Brand Differentials - O Padrão LuxeNail */}
      <section className="bg-gradient-to-b from-zinc-950/20 to-zinc-950/90 py-16 border-y border-zinc-950" id="differentials-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="space-y-3">
          <span className="text-[#dec0b3] font-serif italic tracking-wider text-lg block">Os pilares da nossa excelência</span>
            <h2 className="text-3xl sm:text-4xl tracking-tight text-white uppercase font-light">
              O Padrão <span className="font-serif italic font-normal text-gold-gradient">Das Unhas Feitas por Mim</span>
            </h2>
            <div className="w-16 h-[1.5px] bg-[#dec0b3]/40 mx-auto mt-2"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            
            {/* Diff 1 */}
            <div className="p-8 rounded-sm bg-zinc-950/40 border border-zinc-900 hover:border-[#dec0b3]/20 hover:bg-[#121110]/40 transition-all duration-300 group" id="diff-1">
              <div className="p-3 w-fit rounded-sm bg-zinc-900 border border-zinc-800 text-[#dec0b3] mb-6 group-hover:border-[#dec0b3]/40 transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold tracking-wide text-white uppercase mb-3 font-serif">
                Materiais Esterilizados
              </h3>
              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-light">
                Biossegurança absoluta. Todos os nossos alicates, espátulas e curetas passam por termodesinfecção profunda e autoclave de nível hospitalar antes de cada procedimento.
              </p>
            </div>

            {/* Diff 2 */}
            <div className="p-8 rounded-sm bg-zinc-950/40 border border-zinc-900 hover:border-[#dec0b3]/20 hover:bg-[#121110]/40 transition-all duration-300 group" id="diff-2">
              <div className="p-3 w-fit rounded-sm bg-zinc-900 border border-zinc-800 text-[#dec0b3] mb-6 group-hover:border-[#dec0b3]/40 transition-colors">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold tracking-wide text-white uppercase mb-3 font-serif">
                Atendimento Sob Medida
              </h3>
              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-light">
                Entendemos sua personalidade. Meticulosa análise inicial do biótipo de sua mão e rotina ativa para propor a curvatura, forma geométrica e cor de esmaltação ideais.
              </p>
            </div>

            {/* Diff 3 */}
            <div className="p-8 rounded-sm bg-zinc-950/40 border border-zinc-900 hover:border-[#dec0b3]/20 hover:bg-[#121110]/40 transition-all duration-300 group" id="diff-3">
              <div className="p-3 w-fit rounded-sm bg-zinc-900 border border-zinc-800 text-[#dec0b3] mb-6 group-hover:border-[#dec0b3]/40 transition-colors">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold tracking-wide text-white uppercase mb-3 font-serif">
                Suprimentos Premium
              </h3>
              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-light">
                Exclusividade em polímeros. Seleção rigorosa de preparadores adesivadores, esmaltes hipoalergênicos importados e géis livres de compostos ácidos nocivos à saúde natural.
              </p>
            </div>

            {/* Diff 4 */}
            <div className="p-8 rounded-sm bg-zinc-950/40 border border-zinc-900 hover:border-[#dec0b3]/20 hover:bg-[#121110]/40 transition-all duration-300 group" id="diff-4">
              <div className="p-3 w-fit rounded-sm bg-zinc-900 border border-zinc-800 text-[#dec0b3] mb-6 group-hover:border-[#dec0b3]/40 transition-colors">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold tracking-wide text-white uppercase mb-3 font-serif">
                Espaço Exclusivo
              </h3>
              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-light">
                Dose sensorial de calma. Enquanto cuidamos de você, aproveite nosso cardápio de cafés expressos de torra nobre, lattes artesanais e uma cortesia refrescante de espumante.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Founder Profile section - Ananrs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="founder-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Founder Image */}
          <div className="lg:col-span-5 order-2 lg:order-1 relative" id="founder-img-box">
            <div className="absolute -inset-3 rounded border border-[#d4b24f]/10 pointer-events-none scale-95"></div>
            <div className="aspect-[4/5] rounded overflow-hidden border border-zinc-900 shadow-2xl">
              <img
                src={CONCEPT_INTERIOR_IMAGE}
                alt="Studio Nails By Ananrs"
                className="w-full h-full object-cover select-none brightness-90 hover:scale-[1.03] transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Small dynamic label */}
            <div className="absolute bottom-4 right-4 bg-zinc-950/90 text-zinc-300 blur-backdrop border border-zinc-800 px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase rounded-sm">
              Nails by Ananrs Interior
            </div>
          </div>

          {/* Founder Quote */}
          <div className="lg:col-span-7 order-1 lg:order-2 text-left space-y-6" id="founder-content">
            <span className="text-[#dec0b3] text-xs font-semibold tracking-[0.25em] uppercase">Onde a técnica encontra a sofisticação</span>
            
            <h2 className="text-3xl sm:text-4xl font-serif text-white uppercase font-light leading-tight">
              A Arte e a Ciência por Trás da <span className="text-gold-gradient font-normal italic">Alta Costura de Unhas</span>
            </h2>
            
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed leading-relaxed font-light">
              Não fazemos apenas unhas. Nós esculpimos autênticas extensões da sua personalidade em harmonia perfeita com o seu estilo de vida. Cada detalhe da curvatura milimétrica, cada ponto estrutural sob o topo da tensão e cada esmaltação brilhante é desenhada para permanecer intocável diante do fluxo diário.
            </p>

            <blockquote className="border-l border-[#dec0b3]/60 pl-6 my-6 italic text-zinc-300 text-base font-serif">
              "A beleza verdadeira floresce nos cuidados com o detalhe. Em nosso ambiente, desaceleramos o ritmo corrido do mundo externo para focar estritamente no seu relaxamento e na criação estética de unhas duráveis e impecavelmente esculpidas."
            </blockquote>

            <div>
              <p className="text-[#dec0b3] font-serif font-semibold tracking-widest text-base uppercase">
                Nails by Ananrs
              </p>
              <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase mt-1">
                Fundadora e Diretora Estética de Nail Designer
              </p>
            </div>

            {/* Quick button shortcut to style matcher */}
            <div className="pt-4 flex">
              <button
                id="founder-btn-stylist"
                onClick={onGoToStylist}
               className="inline-flex items-center gap-2.5 bg-zinc-950 border border-[#dec0b3]/30 hover:border-[#dec0b3] hover:bg-zinc-900/50 py-3 px-6 rounded-sm text-xs font-semibold uppercase tracking-wider text-[#dec0b3] transition-all"
              >
                Experimentar Consultor AI
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
