import { prisma } from "@/lib/prisma";
import { CompraRepository } from "@/modules/compra/repository/CompraRepository";
import { aplicarCompraNaDespensa } from "@/modules/despensa/services/aplicarCompraNaDespensa";
import { recalcularSugestoes } from "@/modules/lista/services/recalcularSugestoes";

/**
 * Caso de uso: excluir uma Compra — ADR-023. A Despensa desfaz a contribuição
 * de cada Item que a Compra continha (sem outra fonte, a estimativa some) e
 * as Sugestões são regeneradas. ListaItens marcados COMPRADOS não são
 * revertidos (consequência aceita no ADR-023).
 */
export async function excluirCompra({
  casaId,
  compraId,
}: {
  casaId: string;
  compraId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { data, itens } = await CompraRepository.excluir({
      db: tx,
      casaId,
      id: compraId,
    });

    await aplicarCompraNaDespensa({
      db: tx,
      casaId,
      itens: itens.map((i) => ({
        itemId: i.itemId,
        dataAntiga: data,
        qtdAntiga: i.quantidade,
        dataNova: null,
        qtdNova: 0,
      })),
    });
    await recalcularSugestoes({ db: tx, casaId });
  });
}
