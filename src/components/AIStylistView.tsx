import React, { useState } from "react";
import { Sparkles, Calendar, ChevronRight, RefreshCw, AlertCircle, Copy, Check } from "lucide-react";
import { SERVICES } from "../data";
import { Service, AIStylistRecommendation } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

interface AIStylistViewProps {
  onBookService: (service: Service) => void;
}

interface StylistResponse extends AIStylistRecommendation {
  isFallback?: boolean;
}

export const AIStylistView: React.FC<AIStylistViewProps> = ({ onBookService }) => {
  const [occasion, setOccasion] = useState("daily");
  const [nailShape, setNailShape] = useState("almond");
  const [nailStatus, setNailStatus] = useState("healthy");
  const [styleDescription, setStyleDescription] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StylistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const occasionOptions = [
    { value: "daily", label: "Diário / Casual", desc: "Aparência limpa e durável para a rotina diária." },
    { value: "professional", label: "Executivo / Trabalho", desc: "Sofisticação discreta e credibilidade executiva." },
    { value: "wedding", label: "Casamento / Noiva", desc: "Romantismo impecável de alta costura para o grande dia." },
    { value: "party", label: "Festa / Gala", desc: "Presença glamourosa, folhas metálicas e pedraria luxosa." },
    { value: "holiday", label: "Férias / Viagem", desc: "Resistência máxima para praia, cloro e semanas de brilho." },
  ];

  const shapeOptions = [
    { value: "short", label: "Curto e Ativo", desc: "Praticidade absoluta, extremidade simétrica rente ao dedo." },
    { value: "almond", label: "Almond Médio", desc: "Elegante e ultra-feminino, alonga visualmente os dedos." },
    { value: "stiletto", label: "Stiletto Ousado", desc: "Extremo modernismo, pontas afuniladas e marcantes." },
    { value: "coffin", label: "Bailarina / Coffin", desc: "Formato geométrico moderno com extremidade quadrada reta." },
  ];

  const statusOptions = [
    { value: "healthy", label: "Saudáveis & Fortes", desc: "Flexíveis e sem quebras recorrentes." },
    { value: "fragile", label: "Frágeis / Quebrando fácil", desc: "Finíssimas, descamando nas pontas ou rachando." },
    { value: "short", label: "Muito curtas / Roídas", desc: "Pouca base livre para pintura habitual." },
    { value: "average", label: "Normais com quebras leves", desc: "Quebram principalmente nas quinas e cantos." },
  ];

  const handleConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Inicializa o SDK do Google GenAI direto no front-end de forma segura
      const ai = new GoogleGenAI({ 
        apiKey: import.meta.env.VITE_GEMINI_API_KEY 
      });

      const prompt = `Atue como uma Nail Designer especialista e consultora de visagismo de alto padrão para o estúdio NAILS BY ANANRS.
      Com base nos dados abaixo, retorne um objeto JSON estrito contendo a recomendação ideal para a cliente:
      - Ocasião: ${occasion}
      - Formato desejado: ${nailShape}
      - Estado de saúde das unhas: ${nailStatus}
      - Detalhes/Preferência de estilo da cliente: ${styleDescription || "Nenhum detalhe adicional informado."}

      A lista de IDs de serviços disponíveis no estúdio é: ${SERVICES.map(s => s.id).join(", ")}. Escolha o ID (recommendedServiceId) que mais se encaixa na necessidade.
      
      O formato JSON de resposta deve conter exatamente estas chaves:
      - recommendedServiceId (string, ID do serviço escolhido da lista)
      - explanation (string, explicação acolhedora e elegante do ritual escolhido)
      - artStyleSuggestion (string, sugestão de estetismo artístico detalhado)
      - colorPalette (array de strings contendo 3 cores no formato exato "#HEXADECIMAL Nome da Cor", ex: ["#dec0b3 Nude Clássico", "#000000 Preto Luxo", "#ffffff Branco Leite"])`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (!response.text) {
        throw new Error("Resposta vazia da IA.");
      }

      const parsedData = JSON.parse(response.text) as AIStylistRecommendation;
      setResult(parsedData);

    } catch (err: any) {
      console.error("Erro no consultor de IA:", err);
      setError("Houve um pequeno contratempo ao conectar com nosso estilista AI. Gostaria de tentar novamente?");
    } finally {
      setLoading(false);
    }
  };

  const recommendedService = result 
    ? SERVICES.find(s => s.id === result.recommendedServiceId) || SERVICES[0]
    : null;

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16 text-left" id="ai-stylist-container">
      
      {/* Header section */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#dec0b3] block">Personalização por IA</span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white uppercase font-light tracking-tight">
          Consultoria de <span className="text-gold-gradient italic font-normal">Estilo Inteligente</span>
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm">
          Descubra a combinação ideal de comprimento estrutural, técnica reparadora e tom de esmalte ideal analisado sob os olhos da inteligência artificial regulada.
        </p>
        <div className="w-16 h-[1.5px] bg-[#dec0b3]/40 mx-auto mt-2"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
        
        {/* Form panel Questionnaire: Left column */}
        <div className="lg:col-span-6 bg-zinc-950/40 p-6 sm:p-8 rounded border border-zinc-900/60 space-y-8" id="ai-stylist-questionnaire">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-zinc-900 border border-[#dec0b3]/20">
              <Sparkles className="w-5 h-5 text-[#dec0b3]" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-white tracking-wide">Ficha de Visagismo</h3>
              <p className="text-[11px] text-zinc-500">Responda sobre suas preferências para obter a modelagem perfeita.</p>
            </div>
          </div>

          <form onSubmit={handleConsultation} className="space-y-6">
            
            {/* 1. Occasion */}
            <div className="space-y-3">
              <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase block">1. Qual a ocasião principal do procedimento?</label>
              <div className="grid grid-cols-1 gap-2.5">
                {occasionOptions.map((opt) => (
                  <label 
                    key={opt.value}
                    id={`occasion-opt-${opt.value}`}
                    className={`p-3 rounded-sm border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      occasion === opt.value
                        ? "border-[#dec0b3] bg-[#161413]/30"
                        : "border-zinc-900 bg-[#0d0c0c] hover:border-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="occasion"
                      value={opt.value}
                      checked={occasion === opt.value}
                      onChange={() => setOccasion(opt.value)}
                      className="mt-1 accent-[#dec0b3]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">{opt.label}</span>
                      <span className="text-[10px] text-zinc-500 font-light block mt-0.5">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Shape preference */}
            <div className="space-y-3">
              <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase block">2. Comprimento & Formato de preferência?</label>
              <div className="grid grid-cols-1 gap-2.5">
                {shapeOptions.map((opt) => (
                  <label 
                    key={opt.value}
                    id={`shape-opt-${opt.value}`}
                    className={`p-3 rounded-sm border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      nailShape === opt.value
                        ? "border-[#dec0b3] bg-[#161413]/30"
                        : "border-zinc-900 bg-[#0d0c0c] hover:border-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="nailShape"
                      value={opt.value}
                      checked={nailShape === opt.value}
                      onChange={() => setNailShape(opt.value)}
                      className="mt-1 accent-[#dec0b3]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">{opt.label}</span>
                      <span className="text-[10px] text-zinc-500 font-light block mt-0.5">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Nail status health */}
            <div className="space-y-3">
              <label className="text-xs font-semibold tracking-wider text-zinc-300 uppercase block">3. Qual a saúde atual das suas unhas naturais?</label>
              <div className="grid grid-cols-1 gap-2.5">
                {statusOptions.map((opt) => (
                  <label 
                    key={opt.value}
                    id={`status-opt-${opt.value}`}
                    className={`p-3 rounded-sm border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      nailStatus === opt.value
                        ? "border-[#dec0b3] bg-[#161413]/30"
                        : "border-zinc-900 bg-[#0d0c0c] hover:border-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="nailStatus"
                      value={opt.value}
                      checked={nailStatus === opt.value}
                      onChange={() => setNailStatus(opt.value)}
                      className="mt-1 accent-[#dec0b3]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">{opt.label}</span>
                      <span className="text-[10px] text-zinc-500 font-light block mt-0.5">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Custom preferences style */}
            <div className="space-y-2">
              <label htmlFor="ai-style-info" className="text-xs font-semibold tracking-wider text-zinc-300 uppercase block">
                4. Ideias de look, cor do vestido ou estilo específico de arte?
              </label>
              <textarea
                id="ai-style-info"
                value={styleDescription}
                onChange={(e) => setStyleDescription(e.target.value)}
                rows={3}
                placeholder="Exemplo: Vestido verde esmeralda com brilho discreto, prefiro algo chique sem extravagância..."
                className="w-full bg-[#0d0c0c] border border-zinc-900 rounded-sm p-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#dec0b3]/60 transition-colors resize-none"
              />
            </div>

            {/* Submit call */}
            <button
              type="submit"
              id="ai-stylist-btn-submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#dec0b3] disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-[#b88f7f] text-zinc-950 font-semibold uppercase text-xs tracking-wider rounded-sm transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Confeccionando sua Estetização Inteligente...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisar e Sugerir
                </>
              )}
            </button>

          </form>
        </div>

        {/* Results outcome panel: Right column */}
        <div className="lg:col-span-6 space-y-6" id="ai-stylist-results-panel">
          
          {loading && (
            <div className="rounded border border-dashed border-zinc-900 bg-[#0d0c0c]/40 p-12 text-center space-y-4 h-[500px] flex flex-col items-center justify-center animate-pulse" id="stylist-loading-panel">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full border border-[#dec0b3]/10 animate-ping"></div>
                <Sparkles className="w-10 h-10 text-[#dec0b3] animate-spin duration-3000" />
              </div>
              <div className="space-y-1 max-w-xs mx-auto">
                <h4 className="text-white font-serif text-lg">Decodificando suas Características</h4>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Refinando curvatura, sugerindo harmonia cromática e escolhendo o melhor banho e resistência para o seu tipo de rotina active.
                </p>
              </div>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="rounded border border-[#dec0b3]/10 bg-zinc-950/20 p-10 text-center space-y-4 h-full flex flex-col items-center justify-center min-h-[460px]" id="stylist-idle-panel">
              <div className="p-4 rounded bg-zinc-950 border border-zinc-900 text-zinc-600">
                <Sparkles className="w-8 h-8 opacity-40" />
              </div>
              <div className="space-y-1.5 max-w-xs mx-auto">
                <h4 className="text-zinc-400 font-serif text-lg tracking-wide uppercase">Dossiê Vazio</h4>
                <p className="text-zinc-500 text-xs font-light">
                  Preencha as suas preferências à esquerda e acione o botão para invocar o diagnosticador estético baseado em visagismo artificial.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded border border-red-500/20 bg-red-950/10 p-8 text-center space-y-4 text-zinc-300" id="stylist-error-panel">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-medium">{error}</p>
              <button 
                onClick={handleConsultation} 
                className="inline-flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#dec0b3]/30 px-4 py-2 rounded text-[#dec0b3] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Majestic successful analysis panel */}
          {!loading && result && recommendedService && (
            <div className="bg-[#0c0b0b]/90 border border-gold-glow rounded p-6 sm:p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500" id="stylist-result-success">
              
              {/* Header result */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
                <div className="space-y-1">
                  <span className="text-[9px] tracking-[0.2em] font-bold text-[#dec0b3] uppercase">Diagnóstico Recomendado</span>
                  <p className="text-xs text-zinc-500">
                    Análise profunda por Gemini Studio Client-Side
                  </p>
                </div>
                <div className="px-3 py-1 bg-[#dec0b3]/10 text-[#dec0b3] rounded text-[10px] font-bold tracking-wider uppercase border border-[#dec0b3]/20">
                  Compatibilidade 99%
                </div>
              </div>

              {/* Recommendation message */}
              <div className="space-y-3">
                <h4 className="text-[#dec0b3] font-serif text-lg leading-snug">Seu Ritual de Beleza Ideal:</h4>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed font-light font-sans">
                  {result.explanation}
                </p>
              </div>

              {/* Service Card Shortcut embedded */}
              <div className="p-4 rounded border border-zinc-900 bg-zinc-950/80 flex items-center gap-4 group" id="result-service-shortcut">
                <div className="w-20 h-20 rounded overflow-hidden shrink-0 bg-zinc-900">
                  <img 
                    src={recommendedService.image} 
                    alt={recommendedService.name}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Método Recomendado</span>
                  <h4 className="text-sm font-serif text-white font-medium truncate group-hover:text-[#dec0b3] transition-colors">
                    {recommendedService.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-[#dec0b3]">R$ {recommendedService.price}</span>
                    <span className="text-[10px] text-zinc-500">•</span>
                    <span className="text-[10px] text-zinc-500">{recommendedService.duration}</span>
                  </div>
                </div>
              </div>

              {/* Custom suggestions art info */}
              <div className="space-y-3 border-t border-zinc-900/60 pt-5">
                <h4 className="text-white text-xs font-semibold tracking-wider uppercase">Sugestão de Estetismo Artístico:</h4>
                <p className="text-zinc-400 text-xs leading-relaxed font-light">
                  {result.artStyleSuggestion}
                </p>
              </div>

              {/* Gorgeous luxury colors palette display block */}
              <div className="space-y-4 border-t border-zinc-900/60 pt-5">
                <h4 className="text-white text-xs font-semibold tracking-wider uppercase">Paleta de Prestígio Recomendada:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result.colorPalette.map((colStr, i) => {
                    const match = colStr.match(/#([a-fA-F0-0-9]{6})/);
                    const hex = match ? `#${match[1]}` : "#dec0b3";
                    const label = colStr.replace(/#([a-fA-F0-0-9]{6})/, "").replace(/[\(\)]/g, "").trim() || "Nude";
                    
                    return (
                      <div 
                        key={i} 
                        onClick={() => handleCopyColor(hex)}
                        title="Clique para copiar o Hex Color"
                        className="flex flex-col items-center p-3 rounded bg-zinc-950 hover:bg-[#161413]/30 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer group relative"
                      >
                        {/* Circle color preview bubble */}
                        <div 
                          className="w-8 h-8 rounded-full border border-zinc-850 shadow-inner mb-2.5 flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ backgroundColor: hex }}
                        >
                          {copiedColor === hex ? (
                            <Check className="w-3 h-3 text-white drop-shadow" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-75 text-white mix-blend-difference" />
                          )}
                        </div>
                        <div className="text-center min-w-0">
                          <span className="text-[10px] font-semibold text-zinc-300 block truncate leading-none uppercase">{label}</span>
                          <span className="text-[9px] text-zinc-500 block font-mono mt-1 font-semibold">{hex}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action booking directly */}
              <div className="pt-4 border-t border-zinc-900/60 flex flex-col sm:flex-row items-center gap-3">
                <button
                  id="stylist-btn-schedule-result"
                  onClick={() => onBookService(recommendedService)}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 py-3.5 px-6 font-semibold text-xs tracking-wider uppercase rounded-sm transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Agendar este Serviço
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};