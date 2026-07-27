import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DespensaRepository } from "@/modules/despensa/repository/DespensaRepository";
import {
  calcularConfianca,
  ajustarQtdAposEscritaDeCompra,
} from "@/modules/aprendizado/domain/estimativa";

export type EscritaDeCompraPorItem = {
  itemId: string;
  /** `null` = a Compra não existia antes (registro novo). */
  dataAntiga: Date | null;
  qtdAntiga: number;
  /** `null` = a Compra deixou de existir (exclusão). */
  dataNova: Date | null;
  qtdNova: number;
};

/**
 * Aplica na Despensa o efeito de uma escrita em Compra — registrar (Compra
 * nova), editar ou excluir (§4.3, ADR-023) — item a item. Ajusta a estimativa
 * pontualmente (`ajustarQtdAposEscritaDeCompra`) em vez de recompor tudo do
 * zero, então o restante do histórico do Item (inclusive ajustes como "Tem"/
 * "Pouco", sem valor absoluto persistido) não é perturbado. Lê o histórico já
 * dentro da transação (recebe `db`), então é atômico com a escrita que o
 * disparou. As iterações são sequenciais de propósito — dentro de uma
 * transação as consultas compartilham a mesma conexão.
 */
export async function aplicarCompraNaDespensa({
  db = prisma,
  casaId,
  itens,
  hoje = new Date(),
}: {
  db?: Prisma.TransactionClient;
  casaId: string;
  itens: EscritaDeCompraPorItem[];
  hoje?: Date;
}) {
  for (const it of itens) {
    const [historico, atual] = await Promise.all([
      DespensaRepository.historicoItem({ db, casaId, itemId: it.itemId }),
      DespensaRepository.obterPorItem({ db, casaId, itemId: it.itemId }),
    ]);

    // Sem nenhuma fonte remanescente (nem Compra, nem Ajuste), a estimativa
    // some — Despensa é dado derivado (§3).
    if (historico.numeroCompras === 0 && !historico.ultimoAjuste) {
      await DespensaRepository.removerItem({ db, casaId, itemId: it.itemId });
      continue;
    }

    const qtdEstimada = ajustarQtdAposEscritaDeCompra({
      qtdAtual: atual ? Number(atual.qtdEstimada) : 0,
      ultimoAjuste: historico.ultimoAjuste,
      dataAntiga: it.dataAntiga,
      qtdAntiga: it.qtdAntiga,
      dataNova: it.dataNova,
      qtdNova: it.qtdNova,
    });

    await DespensaRepository.upsertItem({
      db,
      casaId,
      itemId: it.itemId,
      qtdEstimada,
      confianca: calcularConfianca(historico, hoje),
      ultimaCompraEm: historico.ultimaCompraEm,
    });
  }
}
