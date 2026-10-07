# Agenda administrativa

- Calendário mensal: clique em um dia para ver clientes e bloqueios; alterne para a lista do mês.
- Edite serviço, data, horário, nome e WhatsApp. O banco valida conflitos e atualiza a disponibilidade pública na mesma transação.
- Ao trocar o serviço, o preço é atualizado para o valor do catálogo. Ao apenas reagendar, o valor original é mantido.
- **Confirmar pelo WhatsApp** abre a conversa da cliente com serviço, data, horário e endereço. A administradora revisa e envia; abrir o link não registra entrega nem confirmação de leitura.
- Bloqueie um dia inteiro ou um intervalo. Se houver cliente no período, reagende antes. Desbloquear libera o período para novos agendamentos.
- Domingo é folga na interface e no banco. Agendamentos antigos não são apagados.
- Administradora pode agendar a partir de hoje; o público mantém a janela existente de amanhã até 31 dias. A vitrine de datas mostra os próximos 12 dias, sem domingos.
- Resumo mensal mostra quantidade e valor agendado, sem representar pagamentos recebidos.
- O catálogo agora aceita descrição breve, exibida nos detalhes do serviço no celular.

## Validação

`npm run lint` e `npm run build`.

`tests/admin-agenda.sql`: integração transacional com rollback, cobrindo edição, troca de serviço, sincronização dos horários, conflitos, domingos, bloqueios parciais/integral e permissões. Não envia mensagens às clientes.

A migração usa a mesma administradora já autorizada nas políticas existentes. Disponibilidade pública contém somente datas e horários; nomes e telefones continuam restritos.


## Dashboard e relatórios

O dashboard possui filtro mensal independente do calendário da agenda. Apresenta total de agendamentos, valor agendado, ticket médio e dias com agendamentos, com referência ao mês anterior inteiro. Inclui ranking de serviços, distribuição por dia da semana e horário de início, tabela completa de serviços e detalhamento diário.

Os indicadores usam a data do atendimento e o preço registrado no agendamento, incluindo datas futuras. Não são indicadores de faturamento recebido, atendimentos concluídos ou ocupação da agenda. Exclusões removem os registros do relatório. Meses ainda em andamento podem mudar; a comparação não é ajustada por dias decorridos.

O botão **Baixar relatório CSV** exporta dados agregados para Excel, com separador ponto e vírgula, valores decimais em português e codificação UTF-8. Inclui a média de agendamentos por ocorrência de cada dia da semana no mês. Não exporta nomes nem telefones de clientes. Células de texto são protegidas contra interpretação como fórmulas.

A consulta usa as permissões administrativas existentes e pagina os resultados para evitar cortes pelo limite de linhas da API. Mudanças na agenda atualizam o dashboard. Erros de consulta são exibidos, sem transformar falhas em indicadores zerados.

Teste dos cálculos e da exportação: `node --import tsx --test tests/booking-analytics.test.ts`.
