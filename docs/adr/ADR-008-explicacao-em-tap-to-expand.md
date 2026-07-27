# ADR-008: Explicações da IA em tap-to-expand (nunca bloqueiam)

- **Status:** Aceito — ações do drawer ajustadas pelo [ADR-026](./ADR-026-aceite-implicito-da-sugestao.md) (aceite implícito, sem botão "aceitar")
- **Data:** 2026-06-28
- **Fase do produto:** 0 (MVP)
- **Decisor(es):** Gustavo Rezin Durigon

## Contexto
As specs pedem transparência: toda Sugestão da IA deve ter explicação acessível, e "recomendações de forma objetiva" são parte da diretriz de comunicação. Ao mesmo tempo, a spec-design exige interface limpa com informações organizadas por prioridade. Há tensão real: mostrar a explicação sempre (ex.: "Você compra a cada 14 dias. Último: 21 dias atrás.") ocupa espaço e transforma a Lista em um mural de texto. Esconder completamente destrói a transparência.

## Decisão
Explicações da IA nunca aparecem inline na lista principal. Cada Sugestão tem um ícone ⓘ discreto; tocar nele — ou no Item — abre um bottom sheet (drawer) com a explicação completa em linguagem natural. A explicação nunca bloqueia a ação: o drawer tem botões de aceitar/dispensar visíveis. Na Despensa, a explicação do semáforo segue o mesmo padrão.

## Consequências
**Positivas:**
- A Lista permanece limpa e escaneável para o usuário que confia no sistema e não precisa de justificativa.
- Usuários céticos ou novos têm acesso à explicação com 1 toque — sem barreira, sem submenu.
- O padrão é extensível: na Fase 2, explicações mais ricas (faixas de confiança, detecção de mudança de hábito) entram no mesmo drawer sem afetar a tela principal.
- Resolve a inconsistência entre "IA explicável" (spec-produto) e "interface limpa" (spec-design) sem sacrificar nenhum dos dois.

**Negativas / trade-offs:**
- O ícone ⓘ é invisível para usuários que não sabem que ele existe — pode haver curva de descoberta. Mitiga-se com onboarding contextual ou microcópia de primeira visita.
- A qualidade da explicação depende inteiramente do texto gerado pelo back-end. Se a explicação for genérica ("Item identificado como recorrente"), a transparência prometida não se concretiza.
- Dois toques para ver a explicação e agir (toque no Item → toque em aceitar) pode ser percebido como lento para usuários que querem aceitar rapidamente sem ler.

## Alternativas consideradas
- **Explicação sempre visível (inline):** rejeitado porque cada Item ocuparia 3–4 linhas, reduzindo drásticamente o número de itens visíveis por tela e tornando a Lista ilegível com 10+ itens.
- **Explicação apenas na tela de detalhe do Item (não acessível da Lista):** rejeitado porque força navegação para ver uma informação que deveria estar próxima da decisão de aceitar/dispensar.
- **Modal bloqueante de confirmação com explicação:** rejeitado porque interrompe o fluxo de varredura da lista — o usuário que quer aceitar 8 sugestões teria que fechar 8 modais.

## Referências
- [docs/spec-produto.md](../spec-produto.md) — Explicações, Transparência, IA como assistente
- [docs/spec-design.md](../spec-design.md) — Interface limpa, IA identificada e editável
- [ADR-006](./ADR-006-sugestoes-agrupadas-por-motivo.md) — grupos como primeira camada de explicação
- [ADR-004](./ADR-004-confianca-como-semaforo.md) — semáforo cujo detalhe também segue tap-to-expand
