import { prisma } from "@/lib/prisma";
import { ItemRepository } from "@/modules/item/repository/ItemRepository";
import { CompraRepository } from "@/modules/compra/repository/CompraRepository";
import { aplicarCompraNaDespensa } from "@/modules/despensa/services/aplicarCompraNaDespensa";
import { ListaRepository } from "@/modules/lista/repository/ListaRepository";
import { recalcularSugestoes } from "@/modules/lista/services/recalcularSugestoes";
import { resolverCabecalho } from "@/modules/compra/domain/cabecalho";
import {
  entradaCompraSchema,
  type EntradaCompra,
} from "@/modules/compra/services/entradaCompra";

/**
 * Caso de uso: editar uma Compra existente (descrição, data, itens) — ADR-023.
 * As linhas são trocadas por inteiro; a Despensa desfaz a contribuição antiga
 * de cada Item afetado (união dos antigos e novos — um Item removido também
 * precisa recalcular) e refaz a nova, pontualmente. Sugestões são regeneradas
 * na mesma transação.
 */
export async function editarCompra({
  casaId,
  compraId,
  entrada,
}: {
  casaId: string;
  compraId: string;
  entrada: EntradaCompra;
}): Promise<void> {
  const dados = entradaCompraSchema.parse(entrada);
  const { descricao, data } = resolverCabecalho(dados);

  // Fora da transação, espelhando registrarCompra (mesmo trade-off aceito).
  const linhas = await Promise.all(
    dados.itens.map(async (linha) => {
      const item = await ItemRepository.acharOuCriar({
        casaId,
        nome: linha.nome,
      });
      return {
        itemId: item.id,
        quantidade: linha.quantidade,
        unidade: linha.unidade,
        categoria: linha.categoria,
      };
    }),
  );

  await prisma.$transaction(async (tx) => {
    const { dataAntiga, itensAntigos } = await CompraRepository.atualizarComItens({
      db: tx,
      casaId,
      compraId,
      descricao,
      data,
      itens: linhas,
    });

    // Classificação informada no chip sobrescreve a do Item (ADR-022).
    for (const linha of linhas) {
      await ItemRepository.atualizarClassificacao({
        db: tx,
        casaId,
        itemId: linha.itemId,
        categoria: linha.categoria,
        unidadePadrao: linha.unidade,
      });
    }

    // Soma por Item (uma Compra pode, em tese, repetir o mesmo Item em duas
    // linhas). A Despensa desfaz a contribuição antiga de cada Item afetado
    // e refaz a nova — um Item removido na edição vira "qtdNova: 0" (ADR-023).
    const quantidadeNovaPorItem = new Map<string, number>();
    for (const l of linhas) {
      quantidadeNovaPorItem.set(l.itemId, (quantidadeNovaPorItem.get(l.itemId) ?? 0) + l.quantidade);
    }
    const quantidadeAntigaPorItem = new Map(itensAntigos.map((i) => [i.itemId, i.quantidade]));
    const itemIdsNovos = [...quantidadeNovaPorItem.keys()];
    const afetados = new Set([...quantidadeAntigaPorItem.keys(), ...itemIdsNovos]);

    await aplicarCompraNaDespensa({
      db: tx,
      casaId,
      itens: [...afetados].map((itemId) => ({
        itemId,
        dataAntiga,
        qtdAntiga: quantidadeAntigaPorItem.get(itemId) ?? 0,
        dataNova: data,
        qtdNova: quantidadeNovaPorItem.get(itemId) ?? 0,
      })),
    });

    // Item adicionado na edição sai da Lista, coerente com o registro.
    await ListaRepository.marcarComprados({
      db: tx,
      casaId,
      itemIds: itemIdsNovos,
    });
    await recalcularSugestoes({ db: tx, casaId });
  });
}
