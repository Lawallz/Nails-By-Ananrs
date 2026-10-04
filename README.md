# NAILS BY ANANRS - Studio & Intelligent Booking Platform

> Plataforma digital desenvolvida para profissionais de nail design. Construída com React, TypeScript, Tailwind CSS, PostgreSQL e integrada com Google Gemini AI para recomendação inteligente de visagismo e estilo.

---

## Visao Geral

O projeto consiste em uma aplicacao web completa para gestao de atendimento e experiencia do cliente em um studio de manicure e alongamento de unhas. A solucao engloba catalogo dinamico de servicos, agendamento em tempo real sem sobreposicao de horarios, painel administrativo protegido e assistente de visagismo baseado em inteligencia artificial.

---

## Funcionalidades Principais

### 1. Sistema de Agendamento em Nuvem
* Sincronizacao em tempo real via Supabase para evitar sobreposicao de horarios.
* Fluxo de agendamento em etapas validando duracao, servico selecionado e conflitos de agenda.
* Integracao direta para confirmacao de atendimento via WhatsApp.

### 2. Consultor de Estilo Baseado em IA
* Questionario interativo cobrindo ocasiao, formato de preferencia e condicao das unhas.
* Integracao com a API do Google Gemini para geracao de recomendacoes personalizadas e paletas de cores.

### 3. Painel Administrativo Protegido
* Area restrita (`/admin`) para gerenciamento de servicos, precos e duracoes.
* Persistência segura utilizando banco de dados relacional.

---

## Tecnologias Utilizadas

* **Front-end:** React, TypeScript, Tailwind CSS, Lucide Icons
* **Banco de Dados & Backend:** Supabase (PostgreSQL, Realtime, RLS)
* **Inteligencia Artificial:** Google GenAI SDK (modelo configurado em `server.ts`)
* **Hospedagem:** Vercel

---

## Executando o Projeto Localmente

### Pre-requisitos
* Node.js (versao 18 ou superior)
* Gerenciador de pacotes npm ou yarn

### 1. Clonar o repositorio
```bash
git clone https://github.com/Lawallz/Nails-By-Ananrs.git
cd Nails-By-Ananrs
```

### 2. Instalar dependências
`npm ci`

### 3. Configurar variaveis de ambiente
Copie `.env.example` para `.env` na raiz e preencha os valores do seu ambiente. O servidor usa `dotenv.config()` para carregar esse arquivo; mantenha a chave `GEMINI_API_KEY` apenas no ambiente do servidor.

### 4. Rodar localmente
`npm run dev`

O projeto estara disponivel em http://localhost:3000.

## Verificação e build

```bash
npm run lint
npm run build
```

O build gera o frontend e `dist/server.cjs`. O comando `npm start` executa esse servidor; para servir o build em produção, configure `NODE_ENV=production` no ambiente.

Consulte [docs/booking-security.md](docs/booking-security.md) para os detalhes de segurança do agendamento.

## Licenca
Desenvolvido para NAILS BY ANANRS. Todos os direitos reservados.

