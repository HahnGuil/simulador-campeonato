# Simulador de pontos — Liga GT Nacional

Aplicação piloto em React, API Express e PostgreSQL. São dois containers: a aplicação (interface React e API) e o banco PostgreSQL. O cálculo da classificação fica no domínio da API; o React reúne as previsões e apresenta as projeções. A interface usa tema escuro e cores inspiradas na bandeira brasileira.

## Executar

Com Docker Desktop iniciado e acesso ao socket do Docker:

```sh
docker compose up --build -d
```

Abra `http://localhost:5173`. A API fica em `http://localhost:3001/api/health` e o PostgreSQL em `localhost:5432` (`liga` / `liga_dev`, banco `liga_gt`).

## Dados e regras carregados

A carga inicial importa 42 pilotos, 181 resultados registrados nas abas Série A/B/C, as três séries, oito etapas, patrocinadores, poles, voltas mais rápidas e penalizações. Os pontos históricos por etapa são ajustados pelas penalizações e conferidos contra a tabela geral da planilha; os totais coincidem nas três séries.

O regulamento define pontuação de 28 a 5 pontos por posição, +1 por pole e volta mais rápida, bônus de 12 a 1 ponto na Grande Final, dois descartes com Etapas 1 e 8 e Etapa Patrocínio protegidas, e desempate por resultados, poles e voltas mais rápidas. A projeção aplica os descartes, respeita as etapas protegidas e acrescenta o bônus da Final quando a Etapa 8 é selecionada.

Na planilha, há resultados detalhados até a Etapa 4 na Série A e até a Etapa 5 nas Séries B e C. As linhas das etapas posteriores estão vazias. A aplicação permite simular as duas etapas finais (7 e 8), usando o histórico disponível sem inventar resultados ausentes. Digite a posição de cada piloto; ao confirmar um número ocupado, os dois pilotos trocam de posição. Marque P1 (pole) e VMR quando aplicável; cada um acrescenta 1 ponto. Na Etapa 8, o cálculo também soma o bônus de chegada da Grande Final. A tabela projetada lista todos os pilotos e mostra descartes e diferenças para o líder e para o piloto imediatamente à frente. Bônus de patrocínio e novas penalizações não são projetados. Os resultados históricos já incluem os ajustes registrados na planilha e as etapas de patrocínio cumpridas ficam protegidas contra descarte.

## Containers

- `aplicacao`: interface Vite na porta 5173 e API na porta 3001.
- `banco`: PostgreSQL 16 com volume persistente `dados_postgres`.
