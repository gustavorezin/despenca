import { DespensaRepository } from "@/modules/despensa/repository/DespensaRepository";
import {
  calcularConfianca,
  nivelConfianca,
  textoQuantidade,
  gerarExplicacao,
  type NivelConfianca,
} from "@/modules/aprendizado/domain/estimativa";
import { agruparPorCategoria } from "@/modules/item/domain/categorias";
import { rotularDataCompra } from "@/shared/utils/data";

export type LinhaDespensa = {
  id: string;
  itemId: string;
  nome: string;
  /** Classificação crua do Item, para edição pela Despensa (ADR-022). */
  unidade: string | null;
  categoria: string | null;
  nivel: NivelConfianca;
  qtyText: string;
  explicacao: string;
  ultimaCompraLabel: string;
};

export type GrupoDespensa = { categoria: string; itens: LinhaDespensa[] };

/**
 * Despensa pronta para a tela: recalcula a confiança na leitura (a estimativa
 * decai naturalmente com o tempo), traduz em semáforo e agrupa por categoria
 * na ordem de prateleira (mesmo agrupamento do Modo Mercado).
 */
export async function listarDespensa({
  casaId,
  hoje = new Date(),
}: {
  casaId: string;
  hoje?: Date;
}): Promise<GrupoDespensa[]> {
  const linhas = await DespensaRepository.listarComHistorico({ casaId });

  return agruparPorCategoria(
    linhas.map((l) => {
      const nivel = nivelConfianca(calcularConfianca(l.historico, hoje));
      return {
        id: l.id,
        itemId: l.itemId,
        nome: l.nome,
        unidade: l.unidade,
        categoria: l.categoria,
        nivel,
        qtyText: textoQuantidade({
          qtd: l.qtdEstimada,
          unidade: l.unidade,
          nivel,
        }),
        explicacao: gerarExplicacao(l.historico, hoje),
        ultimaCompraLabel: l.historico.ultimaCompraEm
          ? rotularDataCompra(l.historico.ultimaCompraEm)
          : "—",
      } satisfies LinhaDespensa;
    }),
  );
}
