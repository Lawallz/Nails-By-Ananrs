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
