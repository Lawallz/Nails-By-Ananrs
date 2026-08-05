import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AI Style & Consultation endpoint
app.post("/api/consult", async (req, res) => {
  const { occasion, nailShape, styleDescription, nailStatus } = req.body;

  if (!occasion || !nailShape || !nailStatus) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Elegant realistic fallback database recommendation when Gemini API key is not config'd
    console.warn("GEMINI_API_KEY is not configured. Using high-class heuristic recommendation engine.");
    
    let recommendedServiceId = "manicure-signature";
    let explanation = "O cuidado clássico e sofisticado é a base perfeita para o seu perfil. Suas unhas receberão os cuidados dos nossos produtos de alta gama para garantir brilho intenso e elegância.";
    let artStyleSuggestion = "Esmaltação uniforme tradicional no formato selecionado, com um brilho espelhado superior.";
    let colorPalette = ["#800020 (Borgonha Luxe)", "#F5F5DC (Nude Pérola)", "#D4AF37 (Fios de Ouro)"];

    if (nailStatus === "fragile" || nailStatus === "breaking") {
      recommendedServiceId = "blindagem-unhas";
      explanation = "Com base nas suas unhas frágeis, o procedimento ideal é a Blindagem de Unhas naturais. Isso cria um escudo protetor flexível em gel que impede quebras e descamações, oferecendo a estrutura ideal.";
      artStyleSuggestion = "Finalização com top coat ultra-brilhante e um suave filete dourado na ponta para alongar visualmente.";
      colorPalette = ["#F4C2C2 (Rosa Quartzo)", "#E2E8F0 (Seda Platinada)", "#FFFFFF (Branco Lácteo)"];
    } else if (nailStatus === "short") {
      recommendedServiceId = "alongamento-gel";
      explanation = "Para alcançar instantaneamente maior comprimento com estabilidade e naturalidade, o Alongamento em Gel é altamente aconselhável. Ele se adapta de forma excelente ao formato escolhido.";
      artStyleSuggestion = "Transição 'Baby Boomer' do rosa nude ao branco pérola, ou esmaltação plena com acabamento em gel ultra-duradouro.";
      colorPalette = ["#E8D3C9 (Pêssego Matte)", "#FFFFFF (Ponta Translúcida)", "#CFB53B (Champagne Ouro)"];
    } else if (occasion === "party" || occasion === "wedding") {
      recommendedServiceId = "nailart-luxo";
      explanation = "Para uma ocasião de gala extravagante, criamos unhas joia! A combinação de técnicas de nail art de luxo com pedrarias e folhas de ouro garantem que suas mãos sejam um acessório de alto destaque.";
      artStyleSuggestion = "Aplicação sutil de folhas de ouro legítimo 24k encapsuladas e relevos degradê tridimensionais.";
      colorPalette = ["#000000 (Preto Absoluto)", "#D4AF37 (Ouro Imperial)", "#E2E8F0 (Prata Espelhada)"];
    } else if (occasion === "professional") {
      recommendedServiceId = "esmaltacao-gel";
      explanation = "A Esmaltação em Gel oferece um equilíbrio perfeito para a rotina executiva: secagem ultra rápida e brilho que dura 3 semanas inteiras sem uma única imperfeição ou lasca.";
      artStyleSuggestion = "Filamentos de brilho super discretos ou uma francesinha moderna e bem fina estilizada.";
      colorPalette = ["#9C8A87 (Taupe Executivo)", "#F5F5F5 (Pétala Suave)", "#C0C0C0 (Fio de Prata)"];
    }

    return res.json({
      recommendedServiceId,
      explanation,
      artStyleSuggestion,
      colorPalette,
      isFallback: true
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `Analise o perfil e o desejo de beleza da cliente para recomendar o tratamento ou serviço ideal de nail design de luxo para o estúdio "LuxeNail".
    
--- PERFIL DA CLIENTE ---
- Ocasião: ${occasion} (valores possíveis: daily=Diário/Casual, wedding=Casamento/Noiva, professional=Trabalho/Executivo, party=Festa/Gala, holiday=Férias/Viagem)
- Formato & Comprimento Desejado: ${nailShape} (valores possíveis: short=Curto e Quadrado/Ativo, almond=Amendoado de tamanho médio, stiletto=Stiletto Longo e ousado, coffin=Coffin/Bailarina Longo e geométrico)
- Saúde/Status atual das unhas: ${nailStatus} (valores possíveis: healthy=Saudáveis e fortes, fragile=Frágeis/Descamando, short=Muito curtas/Roídas, average=Normais mas quebram com impacto)
- Descrição de Estilo Personalizada pela cliente: "${styleDescription || "Não especificado"}"

--- CATÁLOGO DE PROCEDIMENTOS DISPONÍVEIS ---
- 'manicure-signature' (Manicure clássica luxuosa com cuticulagem e esmaltação tradicional premium)
- 'pedicure-luxo' (Spa relaxante e pedicure alto padrão com esfoliação com cristais)
- 'alongamento-gel' (Modelagem estendida em gel de alta durabilidade e brilho)
- 'fibra-vidro' (Alongamento hiper-resistente e ultrafino com linhas de fibra de vidro)
- 'blindagem-unhas' (Camada protetora rígida de gel sobre a própria unha natural para crescer saudável)
- 'esmaltacao-gel' (Esmaltação com secagem LED durabilidade de 3 semanas sem descascar)
- 'nailart-minimalista' (Linhas extremamente finas, pontuados e mini-geometria sofisticada)
- 'nailart-luxo' (Pedraria fina, folhas de ouro legítimo e pintura artística avançada sob medida)
- 'banho-gel' (Nivelamento com reforço em gel sobre unhas médias para evitar quebras de borda)
- 'spa-pes-maos' (Spa completo sensorial com banho de parafina nutritiva profunda)
- 'reconstrucao' (Plástica reparadora estética para unhas roídas ou danificadas quimicamente)
- 'manutencao-premium' (Calibração periódica da curvatura e preenchimento técnico de alongamentos)

Diga qual destes procedimentos é o ID PRINCIPAL recomendado para esta sessão baseado na saúde da unha e ocasião (use apenas uma das chaves exatas listadas acima). Justifique em um tom refinado de luxo em português. Sugira cores de prestígio com códigos hexadecimais correspondentes.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Você é uma especialista em Nail Estética de Luxo, consultora de imagem sênior do LuxeNail Studio. Sua fala é refinada, atenciosa, requintada e profissional. Sempre retorne respostas estritamente válidas em formato JSON conforme o formato solicitado.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedServiceId: {
              type: Type.STRING,
              description: "Deve ser exatamente uma das chaves recomendadas: 'manicure-signature', 'pedicure-luxo', 'alongamento-gel', 'fibra-vidro', 'blindagem-unhas', 'esmaltacao-gel', 'nailart-minimalista', 'nailart-luxo', 'banho-gel', 'spa-pes-maos', 'reconstrucao', 'manutencao-premium'."
            },
            explanation: {
              type: Type.STRING,
              description: "Uma explicação polida e cativante em português do Brasil justificando por que esse procedimento específico é a escolha perfeita para o estado atual da unha da cliente e sua ocasião."
            },
            artStyleSuggestion: {
              type: Type.STRING,
              description: "Dica estética artística de harmonização (desenho, acabamento fosco/brilhante, pedraria) específica em português."
            },
            colorPalette: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "Lista com 3 ou 4 combinações de cores no formato: '#HEXADO (Nome Elegante da Cor)'."
            }
          },
          required: ["recommendedServiceId", "explanation", "artStyleSuggestion", "colorPalette"]
        }
      }
    });

    const jsonText = response.text ? response.text.trim() : "{}";
    const parsedData = JSON.parse(jsonText);
    res.json({ ...parsedData, isFallback: false });
  } catch (error) {
    console.error("Gemini consultation error:", error);
    res.status(500).json({ error: "Erro interno ao processar a consultoria com IA." });
  }
});

async function startServer() {
  // Vite integration in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware applied.");
  } else {
    // Production ready bundle serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production build static server configuration applied.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LuxeNail Studio server running smoothly on http://0.0.0.0:${PORT}`);
  });
}

startServer();
