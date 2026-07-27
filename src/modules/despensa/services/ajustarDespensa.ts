import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DespensaRepository } from "@/modules/despensa/repository/DespensaRepository";
import {
  calcularConfianca,
  calcularNovaQtdAposAjuste,
} from "@/modules/aprendizado/domain/estimativa";
import { recalcularSugestoes } from "@/modules/lista/services/recalcularSugestoes";

// Ajuste rápido (ADR-007). `valor` é o contrato do PRECISO: obrigatório nele e
// inaplicável aos demais (Tem/Pouco/Acabou não carregam quantidade).
export const ajustarDespensaSchema = z
  .object({
    itemId: z.string().min(1),
    tipo: z.enum(["TEM", "POUCO", "ACABOU", "PRECISO"]),
    valor: z.number().int().min(0).max(999).optional(),
  })
  .superRefine((entrada, ctx) => {
    if (entrada.tipo === "PRECISO" && entrada.valor === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["valor"],
        message: "Informe a quantidade para o ajuste preciso.",
      });
    }
    if (entrada.tipo !== "PRECISO" && entrada.valor !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["valor"],
        message: "Quantidade só se aplica ao ajuste preciso.",
      });
    }
  });

export type AjustarDespensaEntrada = z.infer<typeof ajustarDespensaSchema>;

/**
 * Registra um AjusteDespensa (registro de eventos / proxy de consumo, ADR-013),
 * atualiza o DespensaItem e recalcula as Sugestões — tudo numa transação. Assim
 * "Acabou/Pouco" surgem na Lista pelo motor (§4.5), sem escrita direta.
 */
export async function ajustarDespensa({
  casaId,
  entrada,
  hoje = new Date(),
}: {
  casaId: string;
  entrada: AjustarDespensaEntrada;
  hoje?: Date;
}) {
  const { itemId, tipo, valor } = ajustarDespensaSchema.parse(entrada);

  await prisma.$transaction(async (tx) => {
    // Só se ajusta o que está na Despensa desta Casa. Valida ANTES de qualquer
    // escrita, para não gravar eventos incoerentes de itens de outra Casa.
    const atual = await DespensaRepository.obterPorItem({ db: tx, casaId, itemId });
    if (!atual) {
      throw new Error("Item não está na Despensa desta Casa.");
    }
    const qtdAtual = Number(atual.qtdEstimada);

    await DespensaRepository.registrarAjuste({ db: tx, casaId, itemId, tipo, valor });

    // historicoItem enxerga o ajuste recém-gravado como evento mais recente,
    // então a confiança reflete a intenção do usuário (Tem→alta, Acabou→baixa);
    // qtdUltimaCompra serve de base para "Tem"/"Pouco" quando a estimativa
    // atual já zerou (ver calcularNovaQtdAposAjuste).
    const historico = await DespensaRepository.historicoItem({ db: tx, casaId, itemId });
    const confianca = calcularConfianca(historico, hoje);
    const novaQtd = calcularNovaQtdAposAjuste({
      tipo,
      valor,
      qtdAtual,
      qtdUltimaCompra: historico.qtdUltimaCompra,
    });

    await DespensaRepository.upsertItem({
      db: tx,
      casaId,
      itemId,
      qtdEstimada: novaQtd,
      confianca,
      ultimaCompraEm: historico.ultimaCompraEm,
    });

    await recalcularSugestoes({ db: tx, casaId, hoje });
  });
}
