# StringMatch Visualizer — Sequence Alignment (Programação Dinâmica)

Aplicação web educacional e interativa para demonstrar como a **Programação Dinâmica (*bottom-up*)** resolve o problema clássico de **Alinhamento de Sequências (*Sequence Alignment*)**, desenvolvida para a disciplina de **Projeto de Algoritmos — Módulo 4 (Programação Dinâmica)** do curso de Engenharia de Software da **Universidade de Brasília (UnB / FGA)**.

> **Referência teórica:** Jon Kleinberg & Éva Tardos, *Algorithm Design*, Capítulo 6 — Seções **6.6 (Sequence Alignment)** e **6.7 (Sequence Alignment in Linear Space)**.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Instalação e Execução](#instalação-e-execução)
3. [O Algoritmo Sequence Alignment](#o-algoritmo-sequence-alignment)
4. [Casos-Base, Recorrência e Desempate](#casos-base-recorrência-e-desempate)
5. [Análise de Complexidade](#análise-de-complexidade)
6. [Exemplos de Execução](#exemplos-de-execução)
7. [Arquitetura do Projeto](#arquitetura-do-projeto)
8. [Testes Automatizados](#testes-automatizados)
9. [Roteiro Sugerido para Vídeo de Apresentação (até 5 minutos)](#roteiro-sugerido-para-vídeo-de-apresentação-até-5-minutos)

---

## Funcionalidades

- **Entrada configurável de sequências e custos:** campos para $X$ e $Y$ (até 15 caracteres para manter a matriz legível, com suporte explícito a sequências vazias $\varepsilon$), penalidade de diferença $\alpha(a \neq b) \ge 0$, penalidade de lacuna $\delta \ge 0$, validação imediata e 6 exemplos prontos.
- **Matriz DP interativa $(m+1) \times (n+1)$:** cabeçalhos com índices e $\varepsilon$, destaque dos casos-base, micro-indicadores de direção (`↖`, `↑`, `←`), realce das três células predecessoras na recorrência e setas SVG de transição.
- **Execução determinística passo a passo:** iniciar, executar automaticamente, pausar, avançar, voltar, reiniciar, pular para o fim, navegar pela barra de progresso, ajustar velocidade (`0.5×` a `4×`) e utilizar atalhos de teclado (`Espaço`, `←`, `→`, `Home`).
- **Painel de explicação das decisões:** apresenta os índices $(i, j)$, os caracteres $X[i-1]$ e $Y[j-1]$, os três custos candidatos, a fórmula do caso-base, o menor custo escolhido, a operação resultante e avisos explícitos de empate ótimo.
- **Reconstrução visual do alinhamento ótimo (*traceback*):** após completar a matriz, destaca o caminho ótimo de $(m, n)$ até $(0, 0)$ em cor distinta (**fúcsia**), revela o alinhamento coluna a coluna da direita para a esquerda, classifica correspondências, diferenças e lacunas, exibe o custo total e informa quando há múltiplos alinhamentos ótimos.

---

## Instalação e Execução

### Pré-requisitos

- **Node.js** `>= 18.19` e **npm** `>= 9` (pode ser executado nativamente ou via **WSL**).

### Comandos

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de desenvolvimento (Vite)
npm run dev

# 3. Executar a suíte completa de testes automatizados (Vitest)
npm test

# 4. Verificar tipagem estática (TypeScript strict)
npm run typecheck

# 5. Gerar build de produção
npm run build
```

A aplicação funciona **100% localmente no navegador**, sem backend, banco de dados ou serviços externos.

---

## O Algoritmo Sequence Alignment

Dadas duas sequências $X = x_1 x_2 \dots x_m$ e $Y = y_1 y_2 \dots y_n$, um **alinhamento** associa caracteres de $X$ a caracteres de $Y$ preservando a ordem relativa (sem cruzamentos), podendo inserir lacunas (`-`) em qualquer uma das sequências.

O objetivo é encontrar um alinhamento de **custo mínimo**, somando:
- Penalidades de diferença $\alpha(a, b)$ para cada par alinhado $(a, b)$, onde:
  - $\alpha(a, b) = 0$ se $a = b$ (**correspondência / match**);
  - $\alpha(a, b) = \alpha_{\text{mismatch}} \ge 0$ se $a \neq b$ (**diferença / mismatch**, padrão `1`).
- Penalidade de lacuna $\delta \ge 0$ para cada caractere deixado sem par em $X$ ou em $Y$ (**lacuna / gap**, padrão `1`).

A abordagem **Programação Dinâmica *bottom-up*** explora a subestrutura ótima do problema: o custo mínimo de alinhar os prefixos $X[0..i-1]$ e $Y[0..j-1]$ depende exclusivamente das soluções ótimas de três subproblemas imediatamente menores.

---

## Casos-Base, Recorrência e Desempate

Seja $M[i][j]$ o custo mínimo de alinhar os primeiros $i$ caracteres de $X$ com os primeiros $j$ caracteres de $Y$, para $0 \le i \le m$ e $0 \le j \le n$.

### Casos-base

$$
M[i][0] = i \times \delta \quad (0 \le i \le m)
$$

$$
M[0][j] = j \times \delta \quad (0 \le j \le n)
$$

Alinhar um prefixo de comprimento $k$ com a sequência vazia $\varepsilon$ exige exatamente $k$ lacunas, com custo total $k \times \delta$. Em particular, $M[0][0] = 0$.

### Recorrência ($i > 0$ e $j > 0$)

$$
M[i][j] = \min\Big(
  M[i-1][j-1] + \alpha(X[i-1], Y[j-1]),\;
  M[i-1][j] + \delta,\;
  M[i][j-1] + \delta
\Big)
$$

Interpretação das três transições:
1. **Diagonal (`↖`):** vem de $M[i-1][j-1]$ emparelhando $X[i-1]$ com $Y[j-1]$ (`match` se iguais, `mismatch` se diferentes).
2. **Cima (`↑`):** vem de $M[i-1][j]$ deixando $X[i-1]$ alinhado com lacuna em $Y$ (`X[i-1] ↔ -`).
3. **Esquerda (`←`):** vem de $M[i][j-1]$ deixando $Y[j-1]$ alinhado com lacuna em $X$ (`- ↔ Y[j-1]`).

### Regra determinística de desempate e reconstrução

Quando duas ou mais transições atingem o mesmo valor mínimo $M[i][j]$, a aplicação adota a mesma ordem determinística do procedimento `Find_Sequence` da disciplina (`06-dynamic-programming.pdf`, pág. 41):

1. **Diagonal** (`diagonal`)
2. **Cima** (`up` — lacuna em $Y$)
3. **Esquerda** (`left` — lacuna em $X$)

A reconstrução parte de $(m, n)$ e retrocede até $(0, 0)$ seguindo essa prioridade, garantindo reprodutibilidade absoluta. Além disso, a aplicação detecta matematicamente a existência de múltiplos alinhamentos ótimos verificando se algum vértice do caminho reconstruído possui mais de uma transição ótima.

---

## Análise de Complexidade

| Etapa | Tempo | Espaço |
| --- | --- | --- |
| Preenchimento *bottom-up* da matriz $M$ | $O(m \times n)$ | $O(m \times n)$ |
| Reconstrução do alinhamento (*traceback*) | $O(m + n)$ | $O(m + n)$ |
| **Total do algoritmo** | **$O(m \times n)$** | **$O(m \times n)$** |

- **Tempo $O(m \times n)$:** a matriz possui $(m+1)(n+1)$ células e cada célula é calculada em tempo constante $O(1)$ avaliando no máximo 3 candidatos.
- **Espaço $O(m \times n)$:** armazena a matriz completa $M$ (e o histórico determinístico das etapas para viabilizar a visualização interativa passo a passo e o *traceback*).
- **Nota sobre a Seção 6.7 (Espaço Linear):** conforme apresentado no material da disciplina, é possível reduzir o espaço para $O(m + n)$ mantendo tempo $O(m \times n)$ usando dois vetores (`LAST` e `CURRENT`) para o custo ótimo ou combinando DP com Divisão e Conquista (**Algoritmo de Hirschberg**) para recuperar o alinhamento. Nesta ferramenta educacional, mantemos a matriz completa $O(m \times n)$ justamente para permitir a inspeção visual de todos os subproblemas e do caminho ótimo.

---

## Exemplos de Execução

### 1. `GATO` × `GALO` (padrão: $\alpha = 1, \delta = 1$)

Matriz $M$ ($5 \times 5$):

| $X \setminus Y$ | $\varepsilon$ (`j=0`) | `G` (`j=1`) | `A` (`j=2`) | `L` (`j=3`) | `O` (`j=4`) |
| --- | :---: | :---: | :---: | :---: | :---: |
| **$\varepsilon$ (`i=0`)** | **0** | 1 | 2 | 3 | 4 |
| **`G` (`i=1`)** | 1 | **0** | 1 | 2 | 3 |
| **`A` (`i=2`)** | 2 | 1 | **0** | 1 | 2 |
| **`T` (`i=3`)** | 3 | 2 | 1 | **1** | 2 |
| **`O` (`i=4`)** | 4 | 3 | 2 | 2 | **1** |

- **Custo mínimo:** $M[4][4] = 1$
- **Alinhamento ótimo:** `GATO` ↔ `GALO` (`3` correspondências, `1` diferença `T ≠ L`, `0` lacunas).

### 2. `GATO` × `GALO` com diferença cara ($\alpha = 3, \delta = 1$)

Como $\alpha = 3 > 2\delta = 2$, substituir `T` por `L` custa `3`, enquanto usar duas lacunas custa `2`:
- **Custo mínimo:** `2`
- **Alinhamento ótimo:** `GAT-O` ↔ `GA-LO` (ou `GA-TO` ↔ `GAL-O`, múltiplos ótimos).

### 3. `CTACCG` × `TACATG` ($\alpha = 2, \delta = 1$ — exemplo do material, Seção 6.6)

- **Custo mínimo:** `4` (`1` diferença + `2` lacunas).

### 4. `A` × `AA` ($\alpha = 1, \delta = 1$ — múltiplos alinhamentos ótimos)

- **Custo mínimo:** `1`.
- Existem dois alinhamentos ótimos (`-A` / `AA` e `A-` / `AA`). Pela regra `diagonal > cima > esquerda`, o algoritmo seleciona `-A` / `AA` e sinaliza a existência de múltiplos alinhamentos ótimos.

### 5. $\varepsilon$ × `CASA` ($\alpha = 1, \delta = 1$ — casos-base)

- **Custo mínimo:** `4` (`----` ↔ `CASA`, 4 lacunas em $X$).

---

## Arquitetura do Projeto

A lógica algorítmica é completamente isolada da interface React:

```text
src/
├── types/
│   └── alignment.ts                  # Tipos, constantes (GAP_SYMBOL, TIE_BREAK_ORDER) e contratos
├── algorithm/
│   ├── sequenceAlignment.ts          # Cálculo bottom-up O(m×n) e registro determinístico de etapas
│   ├── reconstructAlignment.ts       # Traceback O(m+n) e detecção de múltiplos alinhamentos ótimos
│   └── index.ts                      # Exportações do módulo algorítmico
├── hooks/
│   ├── usePlaybackController.ts      # Controle determinístico do preenchimento passo a passo
│   └── useTracebackController.ts     # Controle passo a passo da reconstrução ótima
├── components/
│   ├── layout/Header.tsx             # Cabeçalho e informações de complexidade
│   ├── input/                        # Formulário, validação pura e exemplos prontos
│   ├── controls/PlaybackControls.tsx # Controles de execução, velocidade e barra de progresso
│   ├── matrix/DPMatrix.tsx           # Matriz DP (m+1)×(n+1) e camadas SVG (recorrência e traceback)
│   ├── explanation/                  # Painel de decisão da célula atual e cartão da recorrência
│   └── alignment/                    # Painel visual da reconstrução coluna a coluna
└── tests/
    ├── sequenceAlignment.test.ts     # 23 testes unitários do algoritmo, matriz e reconstrução
    └── validation.test.ts            # 6 testes unitários da validação de entrada
```

---

## Testes Automatizados

Execute `npm test` para rodar os **29 testes automatizados** com Vitest cobrindo:
- Exemplo `GATO × GALO` (matriz completa, candidatos e reconstrução).
- Sequências idênticas, totalmente diferentes e tamanhos variados.
- Casos-base com uma ou duas sequências vazias.
- Inserções (`gap-x`), exclusões (`gap-y`) e exemplos do livro-texto (`ocurrance × occurrence`, `CTACCG × TACATG`).
- Diferentes penalidades (incluindo `0`, assimétricas, decimais e rejeição de valores inválidos).
- Múltiplos alinhamentos ótimos, regra determinística de desempate e invariantes globais entre `matrix`, `steps` e `alignment`.
- Validação de formulário da interface.

---

## Roteiro Sugerido para Vídeo de Apresentação (até 5 minutos)

O roteiro abaixo foi desenhado para destacar o **funcionamento do algoritmo** e a **visualização interativa**, mantendo ritmo objetivo dentro do limite de 5 minutos:

| Tempo | Bloco | O que mostrar na tela e explicar |
| --- | --- | --- |
| **0:00 – 0:40** | **Introdução e Problema** | Apresente o nome do projeto (**StringMatch Visualizer**), o problema de **Sequence Alignment** (Kleinberg & Tardos, Seção 6.6) e abra o cartão **Referência da Recorrência** para explicar brevemente $M[i][j]$, os casos-base $i\delta, j\delta$ e as penalidades $\alpha$ e $\delta$. |
| **0:40 – 2:10** | **Preenchimento Passo a Passo (`GATO × GALO`)** | Com o exemplo padrão `GATO × GALO` ($\alpha=1, \delta=1$), clique em **Iniciar algoritmo**. Avance alguns passos manualmente para mostrar os casos-base (primeira coluna e primeira linha). Depois, avance até células internas — destacando especialmente `(3, 3)` (`T` vs `L`) — apontando as **3 setas SVG** na matriz e os **3 candidatos** no painel lateral. Em seguida, clique em **Executar automaticamente** (em `1×` ou `1.5×`) até completar $M[4][4] = 1$. |
| **2:10 – 3:05** | **Reconstrução do Alinhamento Ótimo** | Com a matriz concluída, clique em **Reconstruir passo a passo** no painel inferior. Mostre a diferenciação visual (caminho em **fúcsia** retrocedendo de `(4, 4)` até `(0, 0)`), o alinhamento `GATO` ↔ `GALO` sendo montado da direita para a esquerda e a conferência das métricas (`3` correspondências, `1` diferença, custo total `1`). |
| **3:05 – 4:10** | **Sensibilidade a Penalidades, Empates e Casos-Base** | 1) Selecione o preset **`GATO × GALO (α=3, δ=1)`**, clique em **Ir ao fim** e **Mostrar alinhamento completo**: mostre que, quando diferença fica mais cara que duas lacunas ($\alpha > 2\delta$), o algoritmo passa a preferir 2 lacunas com custo `2` em vez da substituição de custo `3`.<br>2) Selecione **`A × AA`** (ou **`ε × CASA`**): demonstre o aviso de **múltiplos alinhamentos ótimos** e a regra determinística `diagonal > cima > esquerda` (ou o caso-base puro com sequência vazia). |
| **4:10 – 4:45** | **Complexidade e Verificação Automatizada** | Comente a complexidade **Tempo $O(m \times n)$** e **Espaço $O(m \times n)$** (citando a possibilidade de espaço linear $O(m+n)$ da Seção 6.7) e mostre rapidamente no terminal o comando `npm test` passando todos os testes unitários do algoritmo no Vitest. |
| **4:45 – 5:00** | **Encerramento** | Resuma como a separação entre algoritmo puro e visualização determinística facilita o estudo da Programação Dinâmica e encerre a apresentação. |
