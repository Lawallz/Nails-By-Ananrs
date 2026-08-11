import { Service, PortfolioItem } from "./types";

export const SERVICES: Service[] = [
  {
    id: "alongamento-gel",
    name: "Alongamento em Gel",
    category: "alongamento",
    duration: "165 min", // Alterado para 165 min (equivalente a 02h45min) conforme imagem original
    price: 80, // Mantido o preço correto de 80
    description: "Durabilidade e naturalidade absoluta. Ideal para quem busca unhas longas com resistência extrema e um brilho luxuoso que dura semanas.",
    image: "/alongamento.jpg"
  },
  {
    id: "fibra-vidro",
    name: "Acrílico",
    category: "alongamento",
    duration: "180 min",
    price: 250,
    description: "Resistência extrema para unhas finas ou frágeis. A técnica mais avançada para alongamento, proporcionando um resultado ultrafino, leve e totalmente natural.",
    image: "/fibra de vidro.jpeg"
  },
  {
    id: "nailart-luxo",
    name: "Nail Art Luxo",
    category: "outros",
    duration: "60 min",
    price: 80,
    description: "Folhas de ouro genuínas e design artesanal sob medida. Expressão máxima de requinte com pedrarias, texturas e técnicas de pintura exclusivas.",
    image: "/nail art luxo.png"
  },
  {
    id: "pedicure-luxo",
    name: "Pedicure de Luxo",
    category: "pedicure",
    duration: "90 min",
    price: 45,
    description: "Relaxamento profundo e estética superior. Inclui esfoliação com cristais de sal e massagem relaxante para pés renovados e extremamente macios.",
    image: "/pedicure.jpg"
  },
  {
    id: "manutencao-premium",
    name: "Manutenção Premium",
    category: "alongamento",
    duration: "150 min", // Equivalente a 02h30min conforme imagem original
    price: 100,
    description: "Preservação da excelência técnica e integridade. Reposição milimétrica do produto, ajuste do ponto de tensão e nova calibragem da curvatura C perfeitas.",
    image: "/manutencao premium.jpg"
  },
  {
    id: "banho-de-gel",
    name: "Banho de Gel",
    category: "manicure",
    duration: "120 min",
    price: 65,
    description: "Nivelamento primoroso e resistência para suas unhas naturais. Ideal para unhas propensas a quebrar fácil, mantendo sua extensão original elegante.",
    image: "/blindagem unha.png"
  },
  {
    id: "esmaltacao-gel",
    name: "Esmaltação em Gel",
    category: "manicure",
    duration: "90 min", // Equivalente a 01h30min
    price: 45,
    description: "Brilho espetacular e impecável por até 3 semanas. Secagem instantânea sob iluminação LED e resistência superior comparada aos esmaltes tradicionais.",
    image: "/esmaltacao gel.jpg"
  },
  {
    id: "nailart-minimalista",
    name: "Nail Art Minimalista",
    category: "outros",
    duration: "20 min",
    price: 30,
    description: "Elegância refinada em pequenos detalhes. Discretos pontos de luz, linhas finas espelhadas e designs geométricos sutis para um toque artístico moderno.",
    image: "/art minimalista.jpeg"
  },
  {
    id: "banho-gel",
    name: "Banho de Gel",
    category: "manicure",
    duration: "120 min", // Equivalente a 02h00min
    price: 65,
    description: "Nivelamento primoroso e resistência para suas unhas naturais. Ideal para unhas propensas a quebrar fácil, mantendo sua extensão original elegante.",
    image: "/banho de gel.png"
  },
  {
    id: "spa-pes-maos",
    name: "Spa de Pés e Mãos",
    category: "outros",
    duration: "60 min",
    price: 140,
    description: "Tratamento de hidratação ultrassensorial profunda. Banho térmico de parafina, esfoliação suave e massagem com óleos essenciais para uma pele de seda pura.",
    image: "/pedicure.png"
  },
  {
    id: "manicure-signature",
    name: "Manicure Signature",
    category: "manicure",
    duration: "165 min", // Atualizado conforme image_c1c7e0.png (02:45 total em minutos se basear no alongamento, ou você pode usar o número em minutos direto)
    price: 45,
    description: "Exclusividade e cuidado clássico. Um tratamento completo para cutículas e mãos, utilizando produtos de alta gama para um acabamento impecável.",
    image: "/manicure signature.png"
  },
  {
    id: "reconstrucao",
    name: "Reposição", // Mantida a troca solicitada anteriormente
    category: "outros",
    duration: "20 min",
    price: 7,
    description: "Restaura a simetria, a fibra e a saúde biológica das unhas a partir da reposição estrutural milimétrica.",
    image: "/reposição.jpg"
  }
];

export const PORTFOLIO: PortfolioItem[] = [
  {
    id: "p1",
    title: "Minimalismo Linear",
    description: "Nail art com técnica de traços finos brancos sobre base brilhante pérola.",
    image: "/minimalistmo decorado.jpeg"
  },
  {
    id: "p2",
    title: "Quartzo & Solombras",
    description: "Alongamento com transições suaves e realce sob iluminação natural.",
    image: "/quartzo e solombras.jpeg"
  },
  {
    id: "p3",
    title: "Studio Design Clássico",
    description: "Exemplo polido de esmaltação e cuticulagem impecáveis no estúdio.",
    image: "/elegancia cromada.jpeg"
  },
  {
    id: "p4",
    title: "Elegância Monocromática",
    description: "Esmaltação de luxo, linhas precisas e acabamento impecável em estúdio.",
    image: "/magnético monocromático.jpeg"
  }
];

export const CONCEPT_HERO_IMAGE = "/hero-banner.jpeg";
export const CONCEPT_INTERIOR_IMAGE = "/espaço.png";