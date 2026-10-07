import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
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
  const maxAttempts = 1;
  const timeoutMs = 2500;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const generation = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            "Você é uma especialista em Nail Estética de Luxo e consultora de imagem do Nails By Ananrs. Responda em português do Brasil, com tom refinado, acolhedor e profissional. O serviço já foi definido pelo sistema; não o altere. Use exclusivamente as cores do catálogo autorizado.",
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: {
                type: Type.STRING,
                description:
                  "Explicação elegante e objetiva justificando o estilo.",
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
                  "Exatamente 3 cores, copiadas exatamente do catálogo autorizado.",
              },
            },
            required: ["explanation", "artStyleSuggestion", "colorPalette"],
          },
        },
      });

      return await Promise.race([
        generation,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(Object.assign(new Error("Gemini request timeout"), { status: 408 })),
            timeoutMs
          )
        ),
      ]);
    } catch (error) {
      if (!isRetryableGeminiError(error) || attempt === maxAttempts) {
        throw error;
      }

      const baseDelay = 700 * 2 ** (attempt - 1);
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

  let body: {
    occasion?: unknown;
    nailShape?: unknown;
    styleDescription?: unknown;
    nailStatus?: unknown;
  };

  try {
    body = await req.json();
  } catch (error) {
    console.error("Erro ao interpretar body de /api/consult:", error);
    return Response.json(
      { error: "Dados da consultoria inválidos. Recarregue a página e tente novamente." },
      { status: 400 }
    );
  }

  const { occasion, nailShape, styleDescription, nailStatus } = body;

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

    const statusText = String(nailStatus).toLowerCase();
    const occasionText = String(occasion).toLowerCase();

    const selectedService =
      statusText.includes("fragile")
        ? services.find((service) => /banho de gel/i.test(service.name))
        : occasionText === "wedding" || occasionText === "party"
          ? services.find((service) => /decoração premium/i.test(service.name))
          : services.find((service) => /esmaltação em gel - manicure/i.test(service.name)) || services[0];

    const service = selectedService || services[0];

    const { data: colors, error: colorsError } = await supabase
      .from("ai_color_catalog")
      .select("name,hex")
      .order("name", { ascending: true });

    if (colorsError || !colors || colors.length < 3) {
      console.error("Erro ao carregar catálogo de cores:", colorsError);
      return Response.json({ error: "Não foi possível carregar a paleta do salão." }, { status: 503 });
    }

    const colorCatalog = colors.map((color) => `${color.hex} ${color.name}`).join("\n");

    const prompt = `Crie apenas o enriquecimento criativo da consultoria. O serviço já foi escolhido pelo sistema e não pode ser alterado.

PERFIL:
- Ocasião: ${String(occasion).slice(0, 80)}
- Formato/comprimento: ${String(nailShape).slice(0, 80)}
- Saúde/status: ${String(nailStatus).slice(0, 80)}
- Preferência de estilo: ${String(styleDescription || "Não informado").slice(0, 600)}

SERVIÇO DEFINIDO PELO SISTEMA:
- Nome: ${service.name}

CATÁLOGO AUTORIZADO DE CORES:
${colorCatalog}

REGRAS:
1. Não escolha outro serviço.
2. Retorne exatamente 3 cores.
3. Cada cor deve ser copiada EXATAMENTE do catálogo autorizado, incluindo HEX e nome.
4. Não invente HEX, nomes ou tons.
5. Escolha cores que combinem entre si e com o perfil da cliente.
6. Se houver uma cor de roupa ou preferência informada, crie uma combinação coerente com ela.
7. Retorne exatamente o JSON definido pelo schema.`;

    const ai = new GoogleGenAI({ apiKey });

    // Modelos estáveis, priorizando menor latência.
    const models = ["gemini-3.6-flash"];
    let lastError: unknown = null;

    for (const model of models) {
      try {
        const response = await generateWithRetry(ai, model, prompt);

        if (!response.text) {
          throw new Error("Resposta vazia do Gemini.");
        }

        const parsedData = JSON.parse(response.text.trim()) as {
          explanation?: string;
          artStyleSuggestion?: string;
          colorPalette?: string[];
        };

        const allowedColors = new Map(
          colors.map((color) => [
            `${color.hex.toLowerCase()} ${color.name.toLowerCase()}`,
            `${color.hex} ${color.name}`,
          ])
        );

        const normalizedPalette = Array.isArray(parsedData.colorPalette)
          ? parsedData.colorPalette
              .map((color) => allowedColors.get(String(color).trim().toLowerCase()))
              .filter((color): color is string => Boolean(color))
          : [];

        if (
          typeof parsedData.explanation !== "string" ||
          typeof parsedData.artStyleSuggestion !== "string" ||
          normalizedPalette.length !== 3
        ) {
          throw new Error("Resposta do Gemini contém cores fora do catálogo autorizado.");
        }

        return Response.json({
          recommendedServiceId: service.id,
          explanation: parsedData.explanation,
          artStyleSuggestion: parsedData.artStyleSuggestion,
          colorPalette: normalizedPalette,
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

    // Fallback determinístico: o site continua funcional mesmo se a IA estiver indisponível.

    const preferredService =
      statusText.includes("fragile")
        ? services.find((service) => /banho de gel/i.test(service.name))
        : occasionText.includes("wedding") || occasionText.includes("party")
          ? services.find((service) => /decoração premium/i.test(service.name))
          : services.find((service) => /esmaltação em gel - manicure/i.test(service.name)) ||
            services[0];

    const fallbackService = preferredService || services[0];

    return Response.json({
      recommendedServiceId: fallbackService.id,
      explanation:
        "Com base nas suas preferências e no catálogo atual, esta é uma opção equilibrada para o seu perfil. A análise automática de IA está temporariamente indisponível, mas a recomendação continua usando os serviços reais cadastrados no Nails By Ananrs.",
      artStyleSuggestion:
        "Para manter um resultado elegante, combine o formato escolhido com uma decoração delicada e acabamento uniforme.",
      colorPalette: [
        "#dec0b3 Nude Rosé",
        "#f5e6df Champagne",
        "#6f4f46 Marrom Rosado",
      ],
      isFallback: true,
      model: "rules-fallback",
    });
  } catch (error) {
    console.error("Consultation endpoint error:", error);

    const message = error instanceof Error ? error.message : String(error);
    console.error("Consultation endpoint error detail:", message);

    return Response.json(
      {
        error:
          "Não foi possível concluir a consultoria agora. Tente novamente em instantes.",
      },
      { status: 500 }
    );
  }
}

