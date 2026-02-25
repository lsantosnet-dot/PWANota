
PromptNota — Especificação de Redesign da Barra e Gestão de Tags + Backup/Restore (v1.0)
1) Objetivo
Reestruturar a experiência de tags, backup/restore e filtros na tela principal do app PromptNota para:
Garantir que ações essenciais (Gestão de Tags e Backup/Restore) sejam sempre acessíveis, independentemente da quantidade de tags, e mesmo quando não existir nenhum prompt cadastrado.
Desvincular completamente a criação/edição/exclusão de tags do fluxo de criação/edição de prompts.
Reduzir o problema de overflow horizontal da barra de tags (quando tags ocupam todo o espaço e escondem ícones).
Manter na tela de Prompt apenas a opção de vincular/desvincular tags existentes ao prompt (sem criar tags ali).

2) Problemas atuais (baseline)
2.1 Overflow de tags escondendo ações
Na Home, as tags ocupam espaço horizontal.
Ícones de Gestão de tags (roldana) e Backup/restore (download) ficam fora de alcance e exigem arrastar a lista de tags.
2.2 Ações indisponíveis quando não há prompts
Quando o app não tem prompts cadastrados, a UI não oferece acesso a:
Gestão de tags
Backup/restore
2.3 Criação de tags atrelada à criação de prompt
Atualmente, para criar a primeira tag é necessário:
clicar no botão “+” para criar prompt
dentro do modal, clicar em “Criar tags”
Isso cria dependência indesejada e piora o onboarding.

3) Escopo
3.1 Dentro do escopo
Redesign da Home para garantir acesso constante a:
Gestão de Tags
Backup/Restore
Criação de uma tela/modal independente para:
Criar tags
Editar tags
Excluir tags
(Opcional) ordenar tags / alterar cor
Alteração do modal/tela de criação/edição de prompt para:
Permitir apenas seleção de tags existentes (vincular)
Remover criação/edição de tags dentro do prompt
Ajustes de empty states para:
Permitir acesso às opções mesmo sem prompts
3.2 Fora do escopo (por enquanto)
Sincronização em nuvem
Compartilhamento de prompts/tags
Multiusuário
Regras avançadas de automação por tags

4) Princípios de UX
Ações primárias sempre visíveis: backup/restore e gestão de tags não podem ficar escondidos por overflow.
Separação de responsabilidades:
Tela de prompt → só vincular tags
Tela de tags → criar/editar/excluir
Escalabilidade: a UI deve funcionar com 0, 10, 50, 200 tags.
Consistência: o mesmo local para acessar tags e backup em todos os estados do app.

5) Mudanças de UI/UX — Visão Geral
5.1 Home: Remover barra horizontal de tags como “linha principal”
Substituir por uma área de filtro compacta e ações fixas.
Layout proposto (alto nível)
Top Bar / Header
Título/branding (PromptNota)
(Opcional) subtítulo “Seus prompts, sempre à mão”
Campo de busca (já existe)
Linha de ações fixas (sempre visível):
Botão “Filtrar por tags” (abre sheet/modal)
Ícone Gestão de tags (abre tela/modal de tags)
Ícone Backup/Restore (abre tela/modal de backup)
Lista de prompts (quando existir)
FAB “+” criar prompt (já existe)
Importante: Gestão de tags e Backup/Restore devem estar em região fixa (não rolável horizontalmente) e visível sem necessidade de arrastar.

6) Componentes e telas
6.1 Home (lista de prompts)
6.1.1 Elementos
Input: Buscar prompts
Botão: Filtrar por tags (novo)
Botão: Gestão de tags (novo local fixo)
Botão: Backup/Restore (novo local fixo)
Lista de prompts (cards)
FAB: “+” (criar prompt)
6.1.2 Comportamento: Filtro por tags
Ao tocar em “Filtrar por tags”, abrir Bottom Sheet (modal) com:
Lista de tags existentes (checkbox ou chips selecionáveis)
Ação “Limpar filtro”
Ação “Aplicar”
(Opcional) Busca de tags dentro do modal, se houver muitas
O filtro deve permitir:
Nenhuma tag selecionada → mostrar todos os prompts
1 ou mais tags selecionadas → mostrar prompts que possuam:
Modo padrão (OR): prompts com qualquer uma das tags selecionadas
(Opcional futuro) modo AND
6.1.3 Indicador de filtro ativo
Quando houver filtro ativo, exibir:
Um badge/label “Filtro ativo (N)” no botão Filtrar
Ou chips compactos mostrando 1-2 tags + “+X” restantes

6.2 Tela/Modal: Gestão de Tags (novo, independente)
6.2.1 Acesso
A partir da Home (sempre visível)
A partir do modal de edição/criação de prompt por um link “Gerenciar tags” (atalho) — opcional
6.2.2 Funções
Listar tags existentes
Criar nova tag
Editar tag (nome, cor opcional)
Excluir tag (com confirmação)
(Opcional) reordenar tags
6.2.3 Layout sugerido
Título: “Tags”
Campo: “Nova tag” + botão “Adicionar”
Lista de tags:
Nome da tag
Contador de prompts vinculados (opcional, recomendado)
Ações: editar (ícone lápis), excluir (ícone lixeira)
Empty state:
Texto: “Nenhuma tag criada ainda”
CTA: “Criar primeira tag”
6.2.4 Regras
Nome de tag:
Obrigatório
Trim (sem espaços no início/fim)
Comprimento mínimo: 1
Comprimento máximo sugerido: 32 (ajustável)
Unicidade:
Não permitir duas tags com mesmo nome (case-insensitive).
Se tentar duplicar, mostrar erro: “Já existe uma tag com esse nome.”
Excluir tag:
Ao excluir, a tag deve ser removida de todos os prompts (desvincular automaticamente).
Exibir confirmação:
Título: “Excluir tag?”
Corpo: “Esta tag será removida de todos os prompts.”
Botões: “Cancelar” / “Excluir”
Editar tag:
Ao renomear, refletir em todos os prompts vinculados.
(Opcional) Cores:
Se existir cor, manter paleta limitada (ex.: 8-12 cores).
Cor é somente visual.

6.3 Tela/Modal: Backup/Restore (novo ou reposicionado)
6.3.1 Acesso
Sempre visível na Home (mesmo com 0 prompts).
6.3.2 Funções
Backup (exportar)
Restore (importar)
(Opcional) visualizar última data de backup
6.3.3 Regras gerais
Backup deve incluir:
Prompts
Tags
Relação Prompt-Tags
Metadados (datas de criação/atualização, se existirem)
Restore deve:
Validar formato
Confirmar substituição/mescla (definir modo abaixo)
6.3.4 Modos de restore (escolha um)
Modo A — Substituir tudo (recomendado para simplicidade)
Aviso claro: “Restaurar substituirá todos os dados atuais.”
Botões: “Cancelar” / “Restaurar”
Após concluir, voltar para Home e recarregar lista
Modo B — Mesclar
Mescla tags por nome (case-insensitive)
Mescla prompts por ID (se existir) ou por hash/título+conteúdo
Mais complexo (opcional futuro)
Para v1.0: usar Modo A (Substituir tudo).

6.4 Tela/Modal: Criar/Editar Prompt (ajustes)
6.4.1 Mudanças obrigatórias
Remover “Criar tags” de dentro do fluxo do prompt.
Seção “Tags” deve permitir apenas:
Selecionar tags existentes
Desselecionar tags existentes
6.4.2 UI recomendada para seleção de tags
Exibir lista de chips/checkbox:
Exemplo:
Pessoal
Empresarial
Hobby
Se muitas tags:
Mostrar campo “Buscar tags” dentro da seção
Ou botão “Selecionar tags” que abre bottom sheet de seleção
6.4.3 Atalho para gestão (opcional, mas recomendado)
Link discreto: “Gerenciar tags”
Ao tocar, abre tela/modal Gestão de Tags
Ao voltar, recarregar lista de tags no prompt
6.4.4 Estado sem tags
Se não existir nenhuma tag:
Mostrar texto: “Nenhuma tag criada.”
Mostrar botão: “Criar tags” (leva para Gestão de Tags)
Importante: isso não cria tags dentro do prompt; apenas abre a tela correta.

7) Estados vazios (Empty States)
7.1 Home sem prompts
Deve continuar exibindo:
Campo de busca (pode ficar desabilitado ou ativo)
Botões:
Filtrar por tags (pode abrir modal mesmo sem tags e mostrar empty)
Gestão de tags (sempre)
Backup/Restore (sempre)
Texto central (já existe):
“Nenhum prompt ainda”
“Toque no + para adicionar seu primeiro prompt”
7.2 Gestão de tags sem tags
“Nenhuma tag criada ainda”
CTA: “Criar primeira tag”
7.3 Filtro por tags sem tags
“Nenhuma tag disponível para filtrar”
CTA: “Criar tags” (leva para Gestão de Tags)

8) Regras de negócio (detalhadas)
8.1 Modelo de dados (referência)
Tag
id (string/uuid)
name (string)
color (opcional)
createdAt (opcional)
updatedAt (opcional)
Prompt
id (string/uuid)
title (string opcional)
content (string obrigatório)
tagIds (array de ids) ou relação N:N
createdAt / updatedAt (opcional)
8.2 Integridade
Ao deletar tag:
Remover referências tagIds em prompts
Ao renomear tag:
Não altera id, apenas name
8.3 Busca na Home
A busca deve filtrar por:
Título
Conteúdo
(Opcional) nome das tags associadas
Se houver filtro de tags ativo e busca ativa:
Aplicar filtro combinado: prompts = promptsComTagFiltro AND promptsComTextoBusca

9) Navegação e fluxos
9.1 Fluxo: Criar primeira tag sem prompts
Usuário abre app (Home vazio)
Usuário toca em “Gestão de tags”
Usuário cria tag
Volta para Home
Usuário toca “+” para criar prompt e vincula tag
9.2 Fluxo: Backup sem prompts
Home vazio
Usuário toca “Backup/Restore”
Usuário restaura arquivo
Home atualiza lista
9.3 Fluxo: Filtrar prompts
Home com prompts
Usuário toca “Filtrar por tags”
Seleciona tags
Aplicar
Lista atualiza + indicador de filtro ativo

10) Requisitos não funcionais
Responsividade: UI deve funcionar em telas pequenas sem esconder ícones.
Acessibilidade:
Botões com áreas de toque adequadas
Labels/Tooltips para ícones (tags, backup)
Performance:
Filtro e busca devem ser eficientes (debounce na busca)
Renderização de tags em lista virtualizada se necessário (muitas tags)
Persistência:
Alterações em tags devem persistir imediatamente

11) Critérios de Aceite (QA)
A. Acesso às ações
Em Home com 0 prompts, existem botões acessíveis para:
Gestão de Tags
Backup/Restore
Em Home com muitas tags (ex.: 30), os botões:
Gestão de Tags
Backup/Restore permanecem visíveis sem rolagem horizontal.
B. Gestão de tags independente
É possível criar a primeira tag sem criar prompt.
Não existe mais opção de “Criar tags” dentro do fluxo do prompt (apenas atalho para abrir gestão).
C. Tela de prompt
Em criar/editar prompt, é possível apenas vincular/desvincular tags existentes.
Se não houver tags, existe CTA para abrir Gestão de Tags.
D. Filtro
Filtrar por tags funciona com 1 ou mais tags selecionadas.
“Limpar filtro” retorna lista completa.
Filtro combina corretamente com busca.
E. Exclusão/edição
Ao excluir tag, ela é removida de todos os prompts.
Ao renomear tag, todos os prompts refletem o novo nome.
F. Backup/restore
Backup inclui tags e vínculos prompt-tag.
Restore (modo substituir) substitui dados após confirmação.

12) Tarefas de implementação (checklist)
12.1 Home
Criar área fixa para botões: Filtrar / Tags / Backup
Remover dependência de barra horizontal de tags (ou reduzir para chips compactos sem esconder ações)
Implementar indicador de filtro ativo
12.2 Gestão de Tags
Criar tela/modal de tags
Implementar CRUD completo (Create/Read/Update/Delete)
Implementar validação de nome e unicidade
Implementar confirmação de exclusão
12.3 Prompt Modal
Remover criação de tags do prompt
Implementar seleção de tags existentes
(Opcional) Link “Gerenciar tags” para abrir tela de tags
12.4 Backup/Restore
Garantir acesso sempre na Home
Ajustar layout do modal/tela
Garantir inclusão de tags e vínculos no export
Restore com confirmação “substituir tudo”
12.5 Testes
Testar com 0 prompts / 0 tags
Testar com 0 prompts / 20 tags
Testar com 200 prompts / 50 tags
Testar filtro + busca combinados

13) Notas de UI (para manter estilo atual)
Manter tema escuro, gradientes e estilo “neon/purple” já presente.
Botões de ações (Tags/Backup) devem usar ícones consistentes com o design atual.
Preferir bottom sheets para seleção de tags e filtros para preservar fluidez mobile.

14) Entregáveis esperados após alteração
Home com ações fixas e acessíveis
Nova tela/modal de Gestão de Tags
Modal de Prompt com seleção de tags e sem criação de tags
Backup/Restore acessível sempre
Filtro por tags funcional e escalável

