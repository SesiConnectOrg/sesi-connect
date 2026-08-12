# Requisitos do Sistema — SESI Connect

Este documento apresenta os **requisitos funcionais e não funcionais** do **SESI Connect**, plataforma educacional desenvolvida para centralizar aulas, atividades, materiais pedagógicos, cronogramas e recursos de Inteligência Artificial para alunos e professores da rede SESI.

---

## 1. Requisitos Funcionais

Os requisitos funcionais descrevem as funcionalidades que o sistema deverá disponibilizar aos usuários.

### RF01 — Autenticação de usuários

O sistema deverá permitir que alunos e professores realizem login utilizando suas credenciais cadastradas.

### RF02 — Encerramento de sessão

O sistema deverá permitir que o usuário encerre sua sessão por meio da opção de logout.

### RF03 — Cadastro de usuários

O sistema deverá permitir o cadastro de usuários, diferenciando-os entre:

* Alunos;
* Professores.

### RF04 — Controle de acesso por tipo de usuário

O sistema deverá disponibilizar funcionalidades diferentes de acordo com o perfil do usuário autenticado.

Professores deverão possuir permissões para criação e gerenciamento de conteúdos, enquanto alunos deverão possuir acesso aos materiais e atividades disponibilizados.

### RF05 — Gerenciamento de perfil

O sistema deverá permitir que os usuários visualizem e atualizem informações relacionadas ao próprio perfil.

### RF06 — Mural de aulas

O sistema deverá disponibilizar um mural contendo as aulas publicadas pelos professores.

Cada aula poderá apresentar informações como:

* Disciplina;
* Professor responsável;
* Título;
* Descrição;
* Data;
* Conteúdo;
* Materiais relacionados.

### RF07 — Cadastro de aulas

O sistema deverá permitir que professores criem e publiquem novas aulas.

### RF08 — Edição de aulas

O sistema deverá permitir que professores editem informações de aulas publicadas por eles.

### RF09 — Exclusão de aulas

O sistema deverá permitir que professores removam aulas publicadas por eles.

### RF10 — Visualização de aulas

O sistema deverá permitir que os alunos acessem os conteúdos das aulas disponibilizadas pelos professores.

### RF11 — Mural de atividades

O sistema deverá disponibilizar um mural contendo atividades e tarefas cadastradas pelos professores.

### RF12 — Cadastro de atividades

O sistema deverá permitir que professores criem atividades contendo informações como:

* Título;
* Descrição;
* Disciplina;
* Data de publicação;
* Data de entrega;
* Materiais de apoio.

### RF13 — Edição de atividades

O sistema deverá permitir que professores alterem atividades publicadas por eles.

### RF14 — Exclusão de atividades

O sistema deverá permitir que professores removam atividades publicadas por eles.

### RF15 — Visualização de atividades

O sistema deverá permitir que os alunos consultem as atividades disponíveis e seus respectivos prazos.

### RF16 — Repositório de materiais pedagógicos

O sistema deverá disponibilizar uma área destinada ao armazenamento e acesso de materiais pedagógicos.

Os materiais poderão incluir:

* Slides;
* Apostilas;
* PDFs;
* Documentos;
* Listas de exercícios;
* Questões;
* Vídeos;
* Gravações de aulões;
* Outros materiais de apoio.

### RF17 — Upload de materiais

O sistema deverá permitir que professores enviem arquivos e materiais pedagógicos para a plataforma.

### RF18 — Download de materiais

O sistema deverá permitir que os alunos baixem materiais disponibilizados pelos professores quando o download estiver autorizado.

### RF19 — Reprodução de gravações

O sistema deverá permitir que os alunos acessem gravações de aulas e aulões disponibilizadas na plataforma.

### RF20 — Cronograma

O sistema deverá possuir um cronograma para apresentar informações relacionadas a:

* Aulas;
* Atividades;
* Avaliações;
* Aulões;
* Datas de entrega;
* Eventos acadêmicos.

### RF21 — Inteligência Artificial

O sistema deverá disponibilizar recursos de Inteligência Artificial para auxiliar professores na preparação de conteúdos educacionais.

### RF22 — Geração de questões com IA

O professor deverá poder solicitar à Inteligência Artificial a criação de questões com base em um conteúdo informado.

As questões poderão ser:

* Objetivas;
* De múltipla escolha;
* Discursivas.

### RF23 — Seleção de dificuldade das questões

O professor deverá poder selecionar o nível de dificuldade das questões geradas pela Inteligência Artificial.

Os níveis poderão incluir:

* Fácil;
* Médio;
* Difícil.

### RF24 — Geração de listas de exercícios

O sistema deverá permitir que professores utilizem Inteligência Artificial para gerar listas de exercícios relacionadas aos conteúdos trabalhados em aula.

### RF25 — Sugestões de atividades

O sistema deverá permitir que a Inteligência Artificial gere sugestões de atividades pedagógicas com base no conteúdo informado pelo professor.

### RF26 — Revisão do conteúdo gerado pela IA

O sistema deverá permitir que o professor revise e altere o conteúdo produzido pela Inteligência Artificial antes de utilizá-lo ou publicá-lo para os alunos.

### RF27 — Busca de conteúdos

O sistema deverá disponibilizar uma ferramenta de busca para facilitar a localização de aulas, materiais e atividades.

### RF28 — Filtros de conteúdo

O sistema deverá permitir a filtragem de conteúdos por critérios como:

* Disciplina;
* Professor;
* Tipo de material;
* Data.

### RF29 — Notificações

O sistema deverá informar aos usuários sobre eventos relevantes, como:

* Novas atividades;
* Novas aulas;
* Novos materiais;
* Alterações de cronograma;
* Prazos próximos.

### RF30 — Configurações

O sistema deverá possuir uma área de configurações onde o usuário poderá gerenciar preferências relacionadas à utilização da plataforma.

### RF31 — Tema da interface

O sistema poderá permitir a alternância entre modo claro e modo escuro.

### RF32 — Área de redação

O sistema deverá disponibilizar uma área destinada a conteúdos e atividades relacionados à produção textual e redação.

---

# 2. Requisitos Não Funcionais

Os requisitos não funcionais definem características relacionadas à qualidade, segurança, desempenho, compatibilidade e utilização do sistema.

### RNF01 — Responsividade

A interface deverá ser responsiva e adaptar-se a diferentes tamanhos de tela, incluindo:

* Computadores;
* Notebooks;
* Tablets;
* Smartphones.

### RNF02 — Usabilidade

A interface deverá ser simples, organizada e intuitiva, permitindo que alunos e professores utilizem as principais funcionalidades sem necessidade de treinamento avançado.

### RNF03 — Padronização visual

As páginas da plataforma deverão seguir uma identidade visual consistente em relação a:

* Cores;
* Tipografia;
* Botões;
* Menus;
* Ícones;
* Componentes;
* Espaçamentos.

### RNF04 — Compatibilidade com navegadores

O sistema deverá funcionar corretamente nas versões atuais dos principais navegadores utilizados pelos usuários, como:

* Google Chrome;
* Microsoft Edge;
* Mozilla Firefox;
* Safari.

### RNF05 — Desempenho

As páginas e funcionalidades principais deverão apresentar tempo de carregamento adequado, evitando esperas desnecessárias durante a utilização da plataforma.

### RNF06 — Otimização de recursos

O sistema deverá otimizar o carregamento de imagens, scripts, folhas de estilo e demais recursos para reduzir o consumo desnecessário de dados e melhorar o desempenho.

### RNF07 — Segurança de autenticação

As credenciais dos usuários deverão ser protegidas durante o processo de autenticação.

### RNF08 — Proteção de senhas

As senhas dos usuários não deverão ser armazenadas em texto simples no banco de dados.

Deverão ser utilizados mecanismos seguros de hash de senha.

### RNF09 — Controle de autorização

O sistema deverá impedir que usuários acessem funcionalidades ou informações para as quais não possuem permissão.

### RNF10 — Proteção de dados

O sistema deverá adotar medidas de segurança para proteger os dados cadastrados contra acessos não autorizados, alterações indevidas ou exposição acidental.

### RNF11 — Validação de dados

Os dados enviados por formulários deverão ser validados antes de serem armazenados ou processados pelo sistema.

### RNF12 — Segurança contra entradas maliciosas

O sistema deverá implementar mecanismos de proteção contra vulnerabilidades relacionadas à entrada de dados, incluindo ataques de injeção de comandos no banco de dados.

### RNF13 — Segurança no upload de arquivos

O sistema deverá validar arquivos enviados pelos usuários, considerando:

* Extensão;
* Tipo de arquivo;
* Tamanho;
* Permissão do usuário.

### RNF14 — Privacidade

O sistema deverá limitar o acesso a informações pessoais dos usuários apenas às funcionalidades e usuários devidamente autorizados.

### RNF15 — Disponibilidade

O sistema deverá permanecer disponível durante os períodos em que alunos e professores necessitarem acessar os conteúdos acadêmicos, salvo períodos de manutenção ou indisponibilidade técnica.

### RNF16 — Integridade dos dados

O sistema deverá preservar a consistência dos dados armazenados no banco de dados, evitando registros inválidos, duplicações indevidas ou perda de informações.

### RNF17 — Escalabilidade

A arquitetura da plataforma deverá permitir futuras expansões, possibilitando a inclusão de novas funcionalidades e um maior número de usuários.

### RNF18 — Manutenibilidade

O código-fonte deverá ser organizado de maneira modular e padronizada para facilitar futuras alterações, correções e implementação de novas funcionalidades.

### RNF19 — Controle de versão

O código-fonte do projeto deverá utilizar o Git para controle de versão e o GitHub para armazenamento e colaboração entre os integrantes da equipe.

### RNF20 — Organização do código

O projeto deverá possuir separação adequada entre:

* Interface;
* Estilos;
* Scripts;
* Lógica do servidor;
* Banco de dados;
* Arquivos e recursos.

### RNF21 — Banco de dados

O banco de dados deverá possuir uma estrutura organizada e utilizar relacionamentos adequados para reduzir redundâncias e manter a integridade das informações.

### RNF22 — Integração com Inteligência Artificial

A comunicação com serviços externos de Inteligência Artificial deverá ser realizada pelo servidor da aplicação, evitando a exposição de chaves de API no código executado pelo navegador.

### RNF23 — Proteção de credenciais externas

Chaves de API, senhas de banco de dados e outras credenciais privadas não deverão ser armazenadas diretamente no código-fonte público do projeto.

Essas informações deverão ser armazenadas utilizando mecanismos apropriados de configuração, como variáveis de ambiente.

### RNF24 — Tratamento de erros

O sistema deverá tratar possíveis erros de maneira adequada, apresentando mensagens compreensíveis ao usuário sem revelar informações técnicas ou sensíveis da aplicação.

### RNF25 — Acessibilidade

A interface deverá buscar atender boas práticas de acessibilidade, incluindo:

* Contraste adequado entre textos e fundos;
* Textos legíveis;
* Identificação clara de campos;
* Elementos navegáveis de forma consistente;
* Descrições apropriadas para elementos relevantes.

### RNF26 — Legibilidade

Os textos apresentados na plataforma deverão possuir tamanho, contraste e espaçamento adequados para facilitar a leitura dos conteúdos educacionais.

### RNF27 — Consistência de navegação

Os menus, botões e links deverão apresentar comportamento consistente em todas as páginas da plataforma.

### RNF28 — Feedback das ações

O sistema deverá informar ao usuário o resultado das principais operações realizadas, apresentando mensagens de:

* Sucesso;
* Erro;
* Atenção;
* Carregamento.

---

# 3. Prioridade dos Requisitos

Os requisitos poderão ser classificados durante o desenvolvimento de acordo com três níveis de prioridade:

| Prioridade | Descrição                                                                        |
| ---------- | -------------------------------------------------------------------------------- |
| **Alta**   | Funcionalidade essencial para o funcionamento da plataforma.                     |
| **Média**  | Funcionalidade importante, mas que não impede o funcionamento básico do sistema. |
| **Baixa**  | Funcionalidade complementar que poderá ser implementada posteriormente.          |

---

# 4. Considerações Finais

Os requisitos apresentados neste documento representam a base inicial para o desenvolvimento do **SESI Connect**.

Durante a evolução do projeto, novos requisitos poderão ser adicionados ou alterados conforme necessidades identificadas pela equipe, pelos professores e pelos usuários da plataforma.

Toda alteração significativa deverá ser registrada na documentação do projeto e acompanhada por meio do controle de versão no GitHub.
