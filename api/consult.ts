import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const consultationRateLimit = new Map<string, number[]>();
const CONSULTATION_WINDOW_MS = 10 * 60 * 1000;
const CONSULTATION_MAX_REQUESTS = 8;

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function allowConsultation(ip: string) {
  const now = Date.now();
  const recent = (consultationRateLimit.get(ip) || []).filter(
    (timestamp) => now - timestamp < CONSULTATION_WINDOW_MS
  );

  if (recent.length >= CONSULTATION_MAX_REQUESTS) {
    consultationRateLimit.set(ip, recent);
    return false;
  }

  recent.push(now);
  consultationRateLimit.set(ip, recent);
  return true;
}

function isRetryableGeminiError(error: unknown) {
  const candidate = error as {
    status?: number;
    message?: string;
    code?: number;
  };

  const status = Number(candidate?.status ?? candidate?.code ?? 0);
  const message = String(candidate?.message || "").toLowerCase();

  return (
    status === 408 ||
    status === 429 ||
    (status >= 500 && status <= 599) ||
    message.includes("503") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("temporarily")
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  prompt: string
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            "Você é uma especialista em Nail Estética de Luxo e consultora de imagem do Nails By Ananrs. Responda em português do Brasil, com tom refinado, acolhedor e profissional. Use exclusivamente os serviços presentes no catálogo fornecido.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedServiceId: {
                type: Type.STRING,
                description: "ID exato de um serviço do catálogo fornecido.",
              },
              explanation: {
                type: Type.STRING,
                description:
                  "Explicação elegante e objetiva justificando a recomendação.",
              },
              artStyleSuggestion: {
                type: Type.STRING,
                description:
                  "Sugestão artística coerente com o perfil da cliente.",
              },
              colorPalette: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "Exatamente 3 cores no formato '#HEX Nome da Cor'.",
              },
            },
            required: [
              "recommendedServiceId",
              "explanation",
              "artStyleSuggestion",
              "colorPalette",
            ],
          },
        },
      });
    } catch (error) {
      if (!isRetryableGeminiError(error) || attempt === maxAttempts) {
        throw error;
      }

      const baseDelay = 1000 * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      await sleep(baseDelay + jitter);
    }
  }

  throw new Error("Gemini indisponível após as tentativas.");
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ error: "Método não permitido." }, { status: 405 });
  }

  const { occasion, nailShape, styleDescription, nailStatus } = await req.json();

  if (!occasion || !nailShape || !nailStatus) {
    return Response.json(
      { error: "Campos obrigatórios ausentes." },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(req);

  if (!allowConsultation(clientIp)) {
    return Response.json(
      {
        error:
          "Limite temporário do consultor atingido. Aguarde alguns minutos e tente novamente.",
      },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY não configurada no servidor.");
    return Response.json(
      {
        error:
          "O consultor de estilo está temporariamente indisponível. A chave da IA não está configurada no servidor.",
      },
      { status: 503 }
    );
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Credenciais públicas do Supabase não configuradas no servidor."
    );
    return Response.json(
      {
        error:
          "Não foi possível carregar o catálogo de serviços no momento. Tente novamente em instantes.",
      },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id,name,price,duration,image")
      .order("name", { ascending: true });

    if (servicesError) {
      console.error("Erro ao carregar catálogo para o consultor:", servicesError);
      return Response.json(
        {
          error:
            "Não foi possível carregar os serviços cadastrados. Tente novamente em instantes.",
        },
        { status: 503 }
      );
    }

    if (!services || services.length === 0) {
      return Response.json(
        {
          error:
            "Ainda não existem serviços cadastrados no painel. Cadastre pelo menos um serviço antes de usar o consultor.",
        },
        { status: 409 }
      );
    }

    const catalog = services.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
    }));

    const prompt = `Analise o perfil da cliente e recomende UM serviço do catálogo real do Nails By Ananrs.

PERFIL:
- Ocasião: ${String(occasion).slice(0, 80)}
- Formato/comprimento: ${String(nailShape).slice(0, 80)}
- Saúde/status das unhas: ${String(nailStatus).slice(0, 80)}
- Preferência de estilo: ${String(styleDescription || "Não informado").slice(0, 600)}

CATÁLOGO REAL DO SUPABASE:
${JSON.stringify(catalog)}

REGRAS:
1. recommendedServiceId deve ser exatamente um id presente no catálogo.
2. Não invente serviços, preços, durações ou IDs.
3. A recomendação deve considerar principalmente o estado das unhas e a ocasião.
4. Retorne exatamente o JSON definido pelo schema.`;

    const ai = new GoogleGenAI({ apiKey });

    // Ambos são modelos estáveis disponíveis na API Gemini.
    const models = ["gemini-3.8-flash", "gemini-3.6-flash"];
    let lastError: unknown = null;

    for (const model of models) {
      try {
        const response = await generateWithRetry(ai, model, prompt);

        if (!response.text) {
          throw new Error("Resposta vazia do Gemini.");
        }

        const parsedData = JSON.parse(response.text.trim()) as {
          recommendedServiceId?: string;
          explanation?: string;
          artStyleSuggestion?: string;
          colorPalette?: string[];
        };

        const recommendedService = services.find(
          (service) => service.id === parsedData.recommendedServiceId
        );

        if (
          !recommendedService ||
          !parsedData.explanation ||
          !parsedData.artStyleSuggestion ||
          !Array.isArray(parsedData.colorPalette)
        ) {
          throw new Error(
            "Resposta do Gemini não corresponde ao catálogo atual."
          );
        }

        return Response.json({
          recommendedServiceId: recommendedService.id,
          explanation: parsedData.explanation,
          artStyleSuggestion: parsedData.artStyleSuggestion,
          colorPalette: parsedData.colorPalette.slice(0, 3),
          isFallback: model !== models[0],
          model,
        });
      } catch (error) {
        lastError = error;
        console.error(`Gemini consultation failed with ${model}:`, error);

        if (!isRetryableGeminiError(error) && model === models[0]) {
          continue;
        }
      }
    }

    console.error("All Gemini consultation models failed:", lastError);

    return Response.json(
      {
        error:
          "Nosso consultor de estilo está ocupado no momento. Aguarde alguns segundos e tente novamente. Se o problema persistir, o serviço de IA pode estar temporariamente sobrecarregado.",
      },
      { status: 503 }
    );
  } catch (error) {
    console.error("Consultation endpoint error:", error);

    return Response.json(
      {
        error:
          "Não foi possível concluir a consultoria agora. Tente novamente em instantes.",
      },
      { status: 500 }
    );
  }
}
