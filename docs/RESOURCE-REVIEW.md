# Revisão de consumo e segurança — 15/10/2026

## Base observada

- Banco principal: aproximadamente 8,5 MiB, 14 agendamentos, 10 serviços, 1 bloqueio; nenhuma imagem binária armazenada.
- Compute limitado a 0,25 CU. `suspend_timeout_seconds=0` usa o padrão Neon (5 minutos), não significa sempre ligado. Nenhuma alteração de plano ou compute.
- Sem pg_stat_statements instalado: não existe medição comparável de tráfego por consulta nesta revisão.
- Vercel connector desta sessão não lista projetos/equipes. Publicação verificada pela integração GitHub e pelo domínio, sem acesso a métricas/faturamento/variáveis da Vercel.

## Mudanças

- Cache exclusivamente para catálogo público (services/ai_color_catalog): TTL 30 segundos, no máximo 16 respostas, cada resposta até 64 KiB serializados. Memória real inclui overhead JS. Não persiste em disco nem cresce indefinidamente. Atualizações invalidam a instância local; outras instâncias expiram em até 30 segundos. O preço da reserva continua calculado pelo banco.
- Agendamentos, pagamentos, disponibilidade, sessões e usuários nunca entram nesse cache. Cabeçalhos de dados permanecem private/no-store.
- Pedidos concorrentes de token compartilham só a promessa em andamento; nenhum JWT novo em localStorage ou cache persistente.
- Disponibilidade pública só é buscada na etapa de escolher horário e dentro dos 12 dias exibidos; cancela requisições ao sair.
- Limites de corpo por streaming: dados 32 KiB, consultoria 8 KiB, imagem 800.000 bytes. Não depende de Content-Length declarado pelo cliente.
- Consultoria usa quotas atômicas existentes no Postgres: 10/IP/hora e 100/global/dia, independentemente de cold starts. Requisição Gemini abortada após 2,5s, uma tentativa no SDK, saída limitada a 600 tokens. Timeout não garante cancelamento de cobrança no provedor.
- Pool mantém máximo de 3 conexões por instância, timeout de consulta 8s, de lock 3s e de transação ociosa 10s. Erros de conexão ociosa tratados sem revelar credenciais.
- Índices aditivos em disponibilidade, bloqueios, pagamentos e limpeza de quotas (005-resource-indexes.sql).
- Telas secundárias carregadas sob demanda. JS inicial caiu de 530,69 kB (153,40 gzip) para 227,03 kB (69,90 gzip), medidos nos builds locais. Chunks adicionais são baixados ao abrir suas telas.
- Cabeçalhos nosniff, SAMEORIGIN, referrer-policy e permissions-policy. Sem alterar fluxo de login.
- proxy-addr e source-map-js atualizados; npm audit --omit=dev: 2 alertas antes, 0 depois, no momento da revisão.

## Verificação

TypeScript, build e 19 testes passam, incluindo controles de acesso, SQL parametrizado, proteção de campos administrativos, tamanho de corpos e exclusão de dados privados do cache.

## Limites e acompanhamento

Isso reduz trabalho e corrige problemas confirmados; não é garantia de segurança absoluta nem de permanência no plano gratuito. Tráfego, arquivos e uso da IA continuam consumindo cotas.

Fotos novas ainda são armazenadas como WebP no Postgres e servidas com cache CDN. Hoje são zero. Monitorar crescimento e, se o catálogo de fotos crescer, migrar esses binários para armazenamento de objetos com URLs públicas; não acumular uploads substituídos indefinidamente.

A conexão pooled de produção e os limites de gasto/alertas da Vercel precisam ser conferidos quando a integração Vercel der acesso ao projeto. Não há polling periódico no calendário. Revalidar cotas nos painéis após tráfego real; esta revisão não inventa porcentagem de economia de egress.

## Reversão

Reverter o commit de código é suficiente para desfazer as alterações de aplicação. Os índices são aditivos e podem permanecer; não apague dados nem restaure backup sobre reservas novas. Não há senhas ou dados pessoais neste documento.
