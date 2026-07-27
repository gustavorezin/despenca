# ADR-026: Aceite implícito da Sugestão (editar quantidade aceita)

- **Status:** Aceito
- **Data:** 2026-07-14
- **Fase do produto:** 1
- **Decisor(es):** Gustavo Rezin Durigon

## Contexto
O [ADR-008](./ADR-008-explicacao-em-tap-to-expand.md) e a spec-produto §3.6 previam botões de **aceitar** e dispensar no drawer da Sugestão. Durante o Marco 8 (swipe para dispensar), o dono do produto decidiu remover o botão de aceitar: uma Sugestão exibida na Lista já se entende aceita — quem discorda desliza para dispensar. A decisão ficou implícita no redesenho, sem ADR, e deixou dois problemas: (1) o status `ACEITO` do modelo ficou órfão — nenhuma ação o atribuía, embora as consultas o respeitassem; (2) editar a quantidade de uma Sugestão não a protegia do recálculo — a estratégia apaga-e-regenera ([spec-tecnica §4.5](../spec-tecnica.md)) recriava a Sugestão com a quantidade padrão, **descartando uma decisão explícita do usuário** e violando o princípio "o usuário decide" (spec-produto §1).

## Decisão
O aceite da Sugestão é **implícito** — não existe botão "aceitar":

- **Editar a quantidade de uma Sugestão ativa é o gesto de aceite.** O item passa a `ACEITO`: o recálculo deixa de apagá-lo/regenerá-lo e a quantidade escolhida permanece. Na tela ele continua idêntico a uma Sugestão (badge, grupo por motivo, explicação) — o aceite só o protege do recálculo.
- **Dispensar** (swipe ou drawer) marca `DISPENSADO` tanto a Sugestão ativa quanto a aceita — sinal negativo que a suprime até nova Compra ([ADR-013](./ADR-013-aprendizado-por-proxies.md)). Sem isso, dispensar um item aceito o apagaria e o motor o recriaria no recálculo seguinte.
- **Comprar** (registrar Compra com o Item) marca `COMPRADO`, como antes.

## Consequências
**Positivas:**
- Nenhuma decisão do usuário é descartada pelo sistema — a quantidade editada sobrevive a qualquer recálculo.
- O status `ACEITO` volta a ter função precisa: "o usuário se comprometeu com este item e esta quantidade".
- Zero atrito adicional: nenhum botão novo; o gesto que o usuário já faz (ajustar quantidade) carrega a intenção.

**Negativas / trade-offs:**
- Não dá para aceitar sem mexer na quantidade — desnecessário no modelo atual: o item já está na Lista e será marcado no mercado ou comprado.
- Um item `ACEITO` não desaparece se o motor deixaria de sugeri-lo (ex.: um ajuste "Tem" posterior). É o comportamento desejado — compromisso do usuário vale mais que a heurística — mas o item só sai comprando ou dispensando.
- O toque em −/+ por engano aceita a Sugestão. Baixo custo: o efeito visível é nenhum, e dispensar continua a 1 gesto.

## Alternativas consideradas
- **Botão "aceitar" explícito (como previa o ADR-008):** rejeitado no Marco 8 — adiciona um toque a cada Sugestão para confirmar o que a permanência na Lista já diz.
- **Copiar a quantidade editada ao regenerar a Sugestão:** rejeitada porque mantém o apaga-e-recria por baixo (o `ListaItem` muda de id, quebrando estado otimista da UI) e não captura a semântica de compromisso.
- **Remover o status `ACEITO` do modelo:** rejeitada porque é exatamente o mecanismo que protege a decisão do usuário no recálculo (`bloqueados` no recálculo já o respeitava).

## Referências
- [ADR-008](./ADR-008-explicacao-em-tap-to-expand.md) — drawer de explicação; ações ajustadas por este ADR
- [ADR-013](./ADR-013-aprendizado-por-proxies.md) — dispensar como sinal negativo
- [ADR-003](./ADR-003-lista-absorve-recomendacoes.md) — Lista unificada
- [docs/spec-produto.md](../spec-produto.md) — §1 (o usuário decide), §3.6 (Sugestões)
