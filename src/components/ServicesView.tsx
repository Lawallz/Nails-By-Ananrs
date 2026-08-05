import React, { useState, useEffect, useMemo } from "react";
import { Search, Clock, Phone, Sparkles, Filter, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Service } from "../types";

interface ServicesViewProps {
  onSelectServiceForBooking: (service: Service) => void;
  onGoToStylist: () => void;
}

type ServiceCategoryFilter = "all" | "manicure" | "pedicure" | "alongamento" | "outros";

export const ServicesView: React.FC<ServicesViewProps> = ({ onSelectServiceForBooking, onGoToStylist }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryFilter>("all");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca os serviços direto do Supabase ao carregar a página
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('services').select('*');
      if (error) {
        console.error("Erro ao buscar serviços do Supabase:", error);
      } else if (data) {
        setServices(data as Service[]);
      }
      setLoading(false);
    };

    fetchServices();
  }, []);

  const categories = [
    { id: "all", label: "Todas" },
    { id: "manicure", label: "Manicure & Blindagem" },
    { id: "pedicure", label: "Pedicure & Spa" },
    { id: "alongamento", label: "Alongamentos" },
    { id: "outros", label: "Arte & Reposição" },
  ];

  // Filtrando os serviços buscados da nuvem
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === "all" || service.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16 text-left" id="services-view-container">
      
      {/* 1. Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#dec0b3] block">Menu de Experiências</span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white uppercase font-light tracking-tight">
          Artistry in <span className="text-gold-gradient italic font-normal">Every Detail</span>
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          Uma curadoria exclusiva de serviços pensados para elevar sua autoestima através de técnicas avançadas de nail design, biossegurança rigorosa e estética de alto luxo.
        </p>
        <div className="w-16 h-[1.5px] bg-[#dec0b3]/40 mx-auto mt-2"></div>
      </div>

      {/* 2. Interactive Filters Wrapper */}
      <div className="space-y-6 bg-zinc-950/40 p-5 rounded border border-zinc-900/60 max-w-5xl mx-auto" id="services-search-and-filters">
        <div className="flex flex-col md:flex-row items-center gap-4">
          
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-500" />
            <input
              type="text"
              id="services-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por serviço ou palavra-chave..."
              className="w-full bg-[#0d0c0c] border border-zinc-900 rounded-sm py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#dec0b3]/60 focus:ring-1 focus:ring-[#dec0b3]/20 transition-all"
            />
          </div>

          <button 
            id="services-consult-assistant-shortcut"
            onClick={onGoToStylist}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#161413] hover:bg-zinc-900 text-[#dec0b3] text-xs font-semibold uppercase tracking-wider py-3 px-5 rounded-sm border border-[#dec0b3]/20 hover:border-[#dec0b3]/40 transition-colors shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Consultor de Estilo AI
          </button>

        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 border-t border-zinc-900/50 pt-4" id="services-category-tabs">
          <div className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mr-2 flex items-center gap-1.5 animate-pulse">
            <Filter className="w-3 h-3" />
            Filtrar:
          </div>
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`service-filter-tab-${cat.id}`}
              onClick={() => setActiveCategory(cat.id as ServiceCategoryFilter)}
              className={`text-xs px-4 py-1.5 rounded transition-all duration-300 font-medium tracking-wide cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-[#dec0b3] text-zinc-950 shadow-md"
                  : "bg-[#0f0e0e] border border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. The Dynamic Services Grid */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-xs animate-pulse">
          Carregando cardápio de serviços da nuvem...
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="services-grid-list">
          {filteredServices.map((service) => {
            return (
              <div 
                key={service.id} 
                id={`service-card-${service.id}`}
                className="flex flex-col bg-[#0d0c0c] border border-zinc-900 hover:border-zinc-800 rounded-sm overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-2xl relative"
              >
                
                <div className="relative aspect-[16/10] overflow-hidden bg-zinc-950">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none"
                    referrerPolicy="no-referrer"
                  />
                  
                  <span className="absolute top-3 left-3 bg-[#0d0c0c]/90 text-[9px] tracking-[0.15em] uppercase text-[#dec0b3] font-semibold border border-[#dec0b3]/20 px-2.5 py-1 rounded">
                    {service.category === "manicure" ? "Mãos" : service.category === "pedicure" ? "Pés" : service.category === "alongamento" ? "Extensão" : "Adicionais"}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0d0c0c] to-transparent"></div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xl font-serif text-white font-medium group-hover:text-[#dec0b3] transition-colors leading-tight">
                        {service.name}
                      </h3>
                      <p className="text-lg font-serif font-semibold text-[#dec0b3] shrink-0">
                        R$ {service.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{service.duration}</span>
                    </div>

                    <p className="text-zinc-400 text-xs leading-relaxed font-light line-clamp-3">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      id={`service-btn-book-${service.id}`}
                      onClick={() => onSelectServiceForBooking(service)}
                      className="w-full flex items-center justify-center gap-2 border border-zinc-800 hover:border-[#dec0b3] bg-zinc-950 hover:bg-[#121110] text-zinc-300 hover:text-[#dec0b3] py-2.5 px-4 rounded-sm text-xs font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer"
                    >
                      Selecionar e Agendar
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-16 rounded border border-zinc-900 bg-zinc-950/20 max-w-lg mx-auto" id="services-empty-results">
          <p className="text-zinc-500 font-serif italic text-base">Nenhum procedimento encontrado com os termos pesquisados.</p>
          <button 
            onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
            className="mt-4 text-[#dec0b3] text-xs font-semibold underline underline-offset-4 uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      )}

      <section className="bg-zinc-950/70 p-8 sm:p-12 rounded border border-zinc-900 max-w-5xl mx-auto text-center space-y-6" id="services-footer-cta">
        <div className="max-w-xl mx-auto space-y-2">
          <h3 className="text-2xl font-serif text-white tracking-wide">Deseja um atendimento personalizado?</h3>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-light">
            Nossa equipe altamente certificada está pronta para orientar sobre o melhor procedimento estrutural para atender o seu tipo de unha natural e rotinas físicas diárias.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          
          <a
            href="https://wa.me/5511917670355?text=Olá%20Nails%20by%20Ananrs!%20Gostaria%20de%20esclarecer%20duvida%20sobre%20os%20serviços."
            target="_blank"
            rel="noopener noreferrer"
            id="services-cta-whatsapp"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#dec0b3]/40 py-3.5 px-8 rounded-sm text-[#dec0b3] text-xs font-semibold tracking-wider uppercase transition-all"
          >
            <Phone className="w-4 h-4 text-[#dec0b3]" />
            Conversar no WhatsApp
          </a>

          <button
            id="services-cta-stylist"
            onClick={onGoToStylist}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 py-3.5 px-8 rounded-sm text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analisador Inteligente IA
          </button>

        </div>
      </section>

    </div>
  );
};