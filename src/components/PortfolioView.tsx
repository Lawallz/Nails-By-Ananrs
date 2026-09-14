import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Calendar, ZoomIn, X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { PORTFOLIO } from "../data";

interface PortfolioViewProps {
  onGoToBooking: () => void;
  onGoToStylist: () => void;
}

type Category = "Nail art" | "Alongamentos" | "Esmaltação" | "Cuidados" | "Pés";
interface Work { id: string; title: string; description: string; image: string; category: Category; }

// Lista explícita: fotos pessoais, logos e imagens do espaço não entram na galeria.
// Arquivos diferentes com a mesma foto foram incluídos uma única vez.
const additionalWorks: Work[] = [
  { id: "gel-design", title: "Alongamento em Gel", category: "Alongamentos", image: "/alongamento em gel.png", description: "Uma inspiração para quem gosta de comprimento e presença." },
  { id: "alongamento", title: "Detalhes em Azul", category: "Alongamentos", image: "/alongamento.jpg", description: "Mais uma proposta de alongamento para a sua pasta de inspirações." },
  { id: "art-minimalista", title: "Arte Minimalista", category: "Nail art", image: "/art minimalista.jpeg", description: "Pequenos detalhes que fazem parte do resultado." },
  { id: "banho-gel", title: "Banho de Gel", category: "Cuidados", image: "/banho de gel.png", description: "Veja de perto um dos trabalhos de banho de gel." },
  { id: "blindagem", title: "Blindagem", category: "Cuidados", image: "/blindagem unha.png", description: "Acabamento e cuidado em cada detalhe." },
  { id: "esmalte-gel-1", title: "Esmaltação em Gel", category: "Esmaltação", image: "/esmaltacao gel.jpg", description: "Cor e brilho para compor o seu estilo." },
  { id: "esmalte-gel-2", title: "Esmaltação Decorada", category: "Esmaltação", image: "/esmaltacao gel.png", description: "Outra combinação de cores e detalhes para se inspirar." },
  { id: "fibra", title: "Alongamento · Inspiração", category: "Alongamentos", image: "/fibra de vidro.jpeg", description: "Comprimento e formato em uma composição cheia de personalidade." },
  { id: "signature", title: "Manicure Signature", category: "Esmaltação", image: "/manicure signature.png", description: "Uma proposta de manicure para conhecer de perto." },
  { id: "manutencao-1", title: "Manutenção", category: "Cuidados", image: "/manutencao premium.jpg", description: "Um novo acabamento para renovar o visual das unhas." },
  { id: "manutencao-2", title: "Manutenção · Detalhes", category: "Cuidados", image: "/manutencao premium.png", description: "Mais um resultado de manutenção no estúdio." },
  { id: "luxo", title: "Nail Art Luxo", category: "Nail art", image: "/nail art luxo.png", description: "Uma inspiração para quem quer destacar as mãos." },
  { id: "pedicure-1", title: "Pedicure", category: "Pés", image: "/pedicure.jpg", description: "Os pés também têm espaço na nossa galeria." },
  { id: "pedicure-2", title: "Pedicure · Inspiração", category: "Pés", image: "/pedicure.png", description: "Outra proposta de acabamento para os pés." },
  { id: "reconstrucao", title: "Reconstrução", category: "Cuidados", image: "/reconstrucao.png", description: "Registro de um trabalho de reconstrução." },
  { id: "reposicao", title: "Reposição", category: "Cuidados", image: "/reposição.jpg", description: "Detalhes de um trabalho de reposição." },
  { id: "destaque", title: "Detalhes do Estúdio", category: "Nail art", image: "/espaçonovo.jpg", description: "A inspiração da nossa página inicial, agora também na galeria." },
];
const works: Work[] = [
  ...PORTFOLIO.map(item => ({ ...item, category: "Nail art" as Category })),
  ...additionalWorks.filter(item => !PORTFOLIO.some(existing => existing.image === item.image)),
];
const filters = ["Todos", "Nail art", "Alongamentos", "Esmaltação", "Cuidados", "Pés"] as const;
const showcases = [
  { title: "Alongamentos", description: "Formatos e comprimentos para se inspirar.", image: "/alongamento.jpg", category: "Alongamentos" },
  { title: "Esmaltação", description: "Explore as cores e os acabamentos.", image: "/esmaltacao gel.jpg", category: "Esmaltação" },
  { title: "Banho de Gel", description: "Conheça os detalhes dos nossos trabalhos.", image: "/banho de gel.png", category: "Cuidados" },
  { title: "Pedicure", description: "Inspirações para os pés.", image: "/pedicure.jpg", category: "Pés" },
] as const;

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onGoToBooking, onGoToStylist }) => {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visibleWorks = works.filter(work => filter === "Todos" || work.category === filter);
  const selectedIndex = visibleWorks.findIndex(work => work.id === selectedId);
  const selected = visibleWorks[selectedIndex];
  const isOpen = Boolean(selected);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  const navigate = (step: number) => {
    if (visibleWorks.length) setSelectedId(visibleWorks[(selectedIndex + step + visibleWorks.length) % visibleWorks.length].id);
  };
  const chooseCategory = (category: Category) => {
    setFilter(category);
    galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16 text-left" id="portfolio-view-container">
      <header className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#dec0b3]">Feitas por Ananrs</span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white font-light leading-tight">Cada detalhe, uma <span className="text-gold-gradient italic">nova inspiração.</span></h1>
        <p className="text-zinc-400 text-sm leading-relaxed">Conheça os trabalhos do estúdio e encontre ideias para o seu próximo momento de autocuidado.</p>
        <div className="w-16 h-px bg-[#dec0b3]/40 mx-auto" />
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5" id="portfolio-category-showcase">
        {showcases.map(item => (
          <button type="button" key={item.title} onClick={() => chooseCategory(item.category)} className="group relative min-h-44 sm:min-h-52 rounded-sm border border-zinc-800 overflow-hidden bg-zinc-950 p-4 sm:p-5 flex flex-col justify-end text-left focus-visible:outline-2 focus-visible:outline-[#dec0b3]">
            <img src={encodeURI(item.image)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="relative space-y-1"><h2 className="font-serif text-lg sm:text-xl text-white">{item.title}</h2><p className="text-xs text-zinc-300">{item.description}</p></div>
          </button>
        ))}
      </div>

      <section ref={galleryRef} className="space-y-8 scroll-mt-28" aria-labelledby="gallery-title">
        <div className="space-y-3">
          <span className="text-[10px] tracking-[0.25em] text-[#dec0b3] uppercase font-semibold">Galeria de trabalhos</span>
          <h2 id="gallery-title" className="text-2xl sm:text-3xl font-serif text-white">Inspire-se no seu <span className="text-gold-gradient italic">próximo visual</span></h2>
          <p className="text-zinc-400 text-sm">Escolha uma categoria e toque em uma foto para ver todos os detalhes.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar trabalhos por categoria">
          {filters.map(category => (
            <button type="button" key={category} aria-pressed={filter === category} onClick={() => setFilter(category)} className={`rounded-full border px-4 py-2 text-xs transition-colors ${filter === category ? "bg-[#dec0b3] border-[#dec0b3] text-zinc-950" : "border-zinc-800 text-zinc-400 hover:border-[#dec0b3]/50 hover:text-white"}`}>{category}</button>
          ))}
        </div>
        <p aria-live="polite" className="text-xs text-zinc-500">{visibleWorks.length} {visibleWorks.length === 1 ? "trabalho" : "trabalhos"}</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6" id="portfolio-main-grid">
          {visibleWorks.map(item => (
            <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} aria-label={`Ampliar: ${item.title}`} className="group text-left rounded-sm overflow-hidden border border-zinc-900 bg-[#0c0b0b] hover:border-[#dec0b3]/40 focus-visible:outline-2 focus-visible:outline-[#dec0b3] transition-colors">
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                <img src={encodeURI(item.image)} alt={item.title} loading="lazy" decoding="async" width={600} height={750} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none" />
                <span className="absolute bottom-3 right-3 bg-black/70 text-white rounded-full p-2" aria-hidden="true"><ZoomIn className="w-4 h-4" /></span>
              </div>
              <div className="p-3 sm:p-5 space-y-2"><span className="text-[9px] uppercase tracking-widest text-[#dec0b3]">{item.category}</span><h3 className="font-serif text-sm sm:text-lg text-white">{item.title}</h3><p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{item.description}</p></div>
            </button>
          ))}
        </div>
      </section>

      <section className="border border-[#dec0b3]/20 rounded-sm p-6 sm:p-8 bg-[#161413]/40 flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between">
        <div className="space-y-2"><h2 className="font-serif text-xl text-white">Quer uma ideia com a sua personalidade?</h2><p className="text-zinc-400 text-sm">Explore combinações de cores e estilos com o consultor.</p></div>
        <button type="button" onClick={onGoToStylist} className="shrink-0 inline-flex justify-center items-center gap-2 text-[#dec0b3] border border-[#dec0b3]/40 rounded-sm px-5 py-3 text-xs uppercase tracking-wide"><Sparkles className="w-4 h-4" /> Consultor IA <ArrowRight className="w-4 h-4" /></button>
      </section>
      <section className="bg-gradient-to-r from-zinc-950 to-zinc-900/40 p-6 sm:p-10 rounded-sm border border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2"><h2 className="text-xl font-serif text-white">Encontrou sua inspiração?</h2><p className="text-zinc-400 text-sm">Escolha seu horário e traga suas ideias para o estúdio.</p></div>
        <button type="button" onClick={onGoToBooking} className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-[#dec0b3] hover:bg-[#b88f7f] text-zinc-950 font-semibold uppercase text-xs tracking-wider py-3.5 px-7 rounded-sm"><Calendar className="w-4 h-4" /> Agendar meu horário</button>
      </section>

      <dialog ref={dialogRef} onCancel={() => setSelectedId(null)} onClose={() => setSelectedId(null)} onClick={event => { if (event.target === event.currentTarget) setSelectedId(null); }} onKeyDown={event => { if (event.key === "ArrowRight") { event.preventDefault(); navigate(1); } if (event.key === "ArrowLeft") { event.preventDefault(); navigate(-1); } }} aria-labelledby="portfolio-dialog-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-4xl max-h-[92dvh] overflow-y-auto rounded border border-zinc-800 bg-[#0c0b0b] text-white p-0 backdrop:bg-black/85">
        {selected && <>
          <div className="flex justify-between items-center gap-4 p-4 border-b border-zinc-800"><p className="text-xs text-zinc-400" aria-live="polite">{selectedIndex + 1} de {visibleWorks.length}</p><button type="button" autoFocus onClick={() => setSelectedId(null)} aria-label="Fechar foto" className="p-2 rounded hover:bg-zinc-800"><X className="w-5 h-5" /></button></div>
          <img src={encodeURI(selected.image)} alt={selected.title} className="w-full h-[52dvh] sm:h-[62dvh] object-contain bg-black" />
          <div className="p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4"><div className="space-y-1"><h2 id="portfolio-dialog-title" className="font-serif text-xl">{selected.title}</h2><p className="text-sm text-zinc-400">{selected.description}</p></div><div className="flex gap-3"><button type="button" onClick={() => navigate(-1)} aria-label="Foto anterior" className="p-3 rounded border border-zinc-700 hover:bg-zinc-800"><ChevronLeft className="w-5 h-5" /></button><button type="button" onClick={() => navigate(1)} aria-label="Próxima foto" className="p-3 rounded border border-zinc-700 hover:bg-zinc-800"><ChevronRight className="w-5 h-5" /></button></div></div>
        </>}
      </dialog>
    </div>
  );
};