# SESI Connect — Revisão Final

Versão consolidada da interface do SESI Connect.

## O que foi corrigido

- Remoção da arquitetura antiga duplicada (`css/layout/` e `js/core/`).
- Um único núcleo compartilhado em `js/app.js` para loader, navegação, tema, sidebar, modais, notificações e toasts.
- Autenticação isolada em `js/auth.js`, sem chamadas circulares com `app.js`.
- Correção do loader para nunca bloquear a tela indefinidamente.
- Correção da atualização do título da página sem alterar/apagar o `<body>`.
- Scripts específicos carregados somente nas páginas correspondentes.
- Restauração das páginas `ai.html`, `profile.html` e `settings.html`.
- Correção da estrutura e do comportamento dos modais.
- Compatibilidade do CSS atual consolidada em `css/current.css`.
- Correção dos caminhos de CSS, JS e favicon.
- Favicon e logo incluídos em `assets/icons/`.
- Filtros e interações básicas de Alunos e Professores adicionados.
- Integrações da página de Atividades atualizadas para a estrutura HTML atual.
- Agenda lateral do Cronograma conectada ao módulo de calendário.
- API de notificações compartilhada compatível com os módulos atuais.

## Estrutura oficial

```text
SESI Connect Final/
├── index.html
├── assets/
│   └── icons/
├── css/
│   ├── bases/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   ├── current.css
│   └── styles.css
├── js/
│   ├── app.js
│   ├── auth.js
│   └── modules/
└── pages/
```

## Scripts por página

- `index.html`: `auth.js` + `app.js`
- `dashboard.html`: `auth.js` + `app.js` + `dashboard.js`
- `activities.html`: `auth.js` + `app.js` + `activities.js`
- `schedule.html`: `auth.js` + `app.js` + `calendar.js`
- `essay.html`: `auth.js` + `app.js` + `essay.js`
- `lesson.html`: `auth.js` + `app.js` + `lesson.js`
- `ai.html`: `auth.js` + `app.js` + `ai.js`
- demais páginas: `auth.js` + `app.js`

## Login demonstrativo

Enquanto o projeto não possui backend, qualquer e-mail válido e uma senha de pelo menos 6 caracteres são aceitos.

Exemplos:

```text
Aluno
jully.silva@aluno.sesi.br
123456

Professor
professor.teste@sesi.br
123456

Coordenação
coordenacao@sesi.br
123456

Administrador
admin@sesi.br
123456
```

O perfil é inferido pelo texto do e-mail (`aluno`, `professor`, `coordenacao`, `admin`, etc.).

## Como executar

Abra a pasta no VS Code e use uma extensão de servidor local, como Live Server, iniciando pelo `index.html`.

Evite abrir páginas protegidas diretamente antes de fazer login, pois `auth.js` redireciona corretamente para a tela de entrada.

## Validações realizadas

- Todos os arquivos JavaScript passaram em verificação de sintaxe.
- Todos os scripts JavaScript inline passaram em verificação de sintaxe.
- Todos os CSS foram analisados sem erros de parsing.
- Todos os `@import` do CSS apontam para arquivos existentes.
- Nenhum `href`/`src` local quebrado foi encontrado.
- Nenhum ID HTML duplicado foi encontrado.
- Todas as classes utilizadas nos HTMLs possuem cobertura CSS.
- Não existem referências HTML/CSS/JS para as antigas pastas `css/layout/` ou `js/core/`.
- `dashboard.js` é carregado apenas no Dashboard.

> Observação: esta versão é um protótipo frontend. Login, arquivos, mensagens e parte dos dados usam armazenamento local/simulação até que um backend real seja integrado.
