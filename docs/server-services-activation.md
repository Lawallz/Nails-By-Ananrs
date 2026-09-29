# Ativação dos serviços no servidor

## Ordem de ativação

1. Configurar Cloudflare Turnstile para os domínios oficiais do site. Guardar a secret key somente no Supabase; a site key é pública.
2. Adicionar `VITE_TURNSTILE_SITE_KEY` na Vercel (produção e preview de teste).
3. Configurar os segredos abaixo em Supabase > Edge Functions > Secrets. Não colocar valores no GitHub ou em mensagens.
4. Verificar a função `nails-services` em um preview autorizado. O allowlist exige origens exatas, sem barra final. Remover a origem de preview após os testes.
5. Publicar este frontend somente quando as integrações estiverem prontas. Depois ativar Turnstile em Supabase Auth > Bot and Abuse Protection, com a mesma secret key. Confirmar um login válido antes de encerrar a sessão administrativa existente.
6. Conferir Supabase Auth > Rate Limits. Esses limites são nativos do serviço e não são substituídos por limites locais no navegador. Não modificar Auth por SQL.
7. Revogar a chave anterior do Gemini no provedor e remover `VITE_GEMINI_API_KEY` da Vercel. Uma chave nova deve ser usada apenas no servidor. Remover do build não revoga cópias antigas.
8. Configurar o EmailJS para a modalidade de uso autenticado no servidor e desativar o caminho antigo de envio pelo navegador, conforme as opções disponíveis na conta. Não considerar o envio protegido contra chamadas diretas apenas por remover o SDK do frontend. Se a conta não permitir exigir credencial privada, será necessário usar um provedor com autenticação exclusivamente no servidor.

## Segredos da Edge Function

| Nome | Valor esperado |
|---|---|
| `GEMINI_API_KEY` | Nova chave do projeto Gemini |
| `GEMINI_MODEL` | ID de um modelo Gemini disponível para essa chave |
| `TURNSTILE_SECRET_KEY` | Secret key do widget Turnstile |
| `EMAILJS_PRIVATE_KEY` | Credencial privada para envio pelo servidor |
| `EMAILJS_PUBLIC_KEY` | Identificador da conta EmailJS |
| `EMAILJS_SERVICE_ID` | Serviço de e-mail já configurado |
| `EMAILJS_TEMPLATE_ID` | Template de aviso para a administradora |
| `ALLOWED_ORIGINS` | Origens oficiais separadas por vírgula, por exemplo `https://nails-by-ananrs.vercel.app` |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo runtime. Não copiar a service role para a Vercel ou para o navegador. A função mantém `verify_jwt = true` e utiliza o cliente anon JWT atual. Uma migração futura para publishable keys exige ajustar essa autenticação.

## Comportamento

- IA: 10 tentativas por IP por hora, em janela fixa, e 100 chamadas autorizadas globalmente por dia UTC. CAPTCHA inválido não consome o limite global. O endereço usado pelo contador é derivado com um segredo; nenhum IP bruto é salvo nessa tabela.
- A verificação Turnstile confere sucesso, hostname e ação `consult`. Tokens expirados ou repetidos são recusados pelo provedor.
- A IA só pode recomendar IDs do catálogo atual. A saída é validada antes de retornar.
- Notificações: 30 solicitações por IP/hora. Uma reserva precisa existir e possuir um comprovante aleatório para solicitar envio. Nome, telefone, serviço e horário são carregados do banco, não do pedido do navegador.
- Cada mensagem é reivindicada atomicamente uma vez. Falhas e respostas ambíguas ficam `uncertain`; não há reenvio automático, pois o provedor pode já ter enviado a mensagem. Conferir o histórico do EmailJS antes de qualquer intervenção manual.
- Não há worker periódico nesta versão. Se a aba fechar antes de solicitar o aviso, a mensagem pode permanecer `pending`; o comprovante é válido por 24 horas. A reserva continua acessível no painel. Isso não é uma garantia de entrega exatamente uma vez.
- Sem segredos, o servidor retorna 503 antes de chamar os provedores. O frontend de login usa o CAPTCHA quando a site key está configurada; a exigência efetiva precisa ser ativada no Supabase Auth.
- O template de e-mail deve ter destinatário fixo da administradora. Não habilitar auto-reply nem destinatário arbitrário baseado em parâmetros do cliente.

## Testes e verificações

- `npm run lint`
- `npm run build`
- `node --import tsx --test tests/server-services.test.ts` — usa provedores simulados, sem enviar e-mails ou fazer chamadas pagas de IA.
- `deno check supabase/functions/nails-services/index.ts`
- `tests/server-services.sql` dentro de `BEGIN; ... ROLLBACK;` — comprova quotas, permissões e reivindicação única.
- Testar sem JWT, origem não autorizada, segredo ausente, CAPTCHA expirado, saída inválida e limite excedido.
- O teste real de login/CAPTCHA e de envio fica para depois da configuração dos provedores. Não ativar CAPTCHA no Auth antes de publicar a site key no frontend.

As tabelas `private` têm RLS e nenhum acesso de clientes por projeto. Os avisos informativos de RLS sem políticas nessas tabelas são esperados.
