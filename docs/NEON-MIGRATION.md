# Recuperação do banco e painel

O site usa Vercel Functions e PostgreSQL no Neon. O navegador nunca recebe DATABASE_URL. O login usa Neon Auth pelo proxy /api/auth no próprio domínio. A API valida JWT (assinatura, emissor, público e expiração) e consulta private.admin_users pelo identificador do usuário, sem conceder acesso pelo simples fato de estar autenticado.

Variáveis de servidor: DATABASE_URL (pooled), NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET (segredo aleatório de pelo menos 32 caracteres), GEMINI_API_KEY. Nenhuma delas deve usar prefixo VITE, exceto a URL pública da integração, se já existir.

## Restauração

1. Executar scripts/prepare-neon-recovery.py com o diretório privado do backup e um destino fora do repositório. O script gera esquema versionado e um payload privado com dados.
2. Restaurar em uma branch Neon isolada. O payload cria tabelas, importa os dados históricos antes dos gatilhos e instala as regras de agenda/pagamento.
3. Aplicar 003-images.sql e 004-static-service-images.sql. As imagens do Supabase não estão no backup; o catálogo usa arquivos existentes em public. Novas fotos são comprimidas para WebP e servidas com cache da CDN.
4. Rodar tests/neon-recovery.sql: os dados sintéticos são revertidos por subtransação. Rodar node --import tsx --test tests/neon-api.test.ts tests/booking-analytics.test.ts, npm run lint e npm run build.
5. Confirmar contagens e restaurar em main somente após validação. Nunca incluir o backup ou os dados de clientes em git.

## Acesso administrativo

Criar a conta no Neon Auth para o e-mail real confirmado pela proprietária. Adicionar exclusivamente seu ID a private.admin_users. No painel, usar Primeiro acesso / esqueci minha senha para definir uma senha por e-mail. Senhas e sessões do Supabase não são migradas. Manter as origens de produção na lista de domínios confiáveis do Neon Auth.

A API permite somente tabelas, campos, filtros e operações declarados em backend/query.ts. Agendamentos nunca são excluídos pelo painel; cancelamentos preservam o histórico. Somente o livro de pagamentos altera paid_amount. Leituras privadas e sessões usam Cache-Control: private, no-store.

## Reversão

A versão anterior da Vercel e o backup original são preservados. Reverter apenas o código não torna o Supabase acessível enquanto houver bloqueio de cota. Após novos agendamentos no Neon, não substituir o banco por um backup antigo: exportar as alterações primeiro.
