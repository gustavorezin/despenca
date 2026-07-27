import { ListaRepository } from "@/modules/lista/repository/ListaRepository";
import { AprendizadoRepository } from "@/modules/aprendizado/repository/AprendizadoRepository";
import { gerarSugestao } from "@/modules/aprendizado/domain/motor";

export type LinhaLista = {
  listaItemId: string;
  itemId: string;
  nome: string;
  ehSugestao: boolean;
  badge: string;
  unidade: string;
  qtd: number;
  resumo: string;
  explicacao: string;
};

export type GrupoLista = { chave: string; titulo: string; itens: LinhaLista[] };

const GRUPOS = [
  { chave: "acabando", titulo: "Provavelmente acabando" },
  { chave: "recorrente", titulo: "Recorrentes" },
  { chave: "adicionou", titulo: "Você adicionou" },
] as const;

/**
 * Monta a Lista (home) unificando Sugestões + manuais, agrupadas por motivo
 * (ADR-002/003/006). As explicações das Sugestões são regeneradas pelo motor a
 * partir do histórico (linguagem sempre atual; ADR-008).
 */
export async function montarLista({
  casaId,
  hoje = new Date(),
}: {
  casaId: string;
  hoje?: Date;
}): Promise<GrupoLista[]> {
  const ativos = await ListaRepository.listarAtivos({ casaId });
  if (ativos.length === 0) return [];

  const historicos = await AprendizadoRepository.historicos({ casaId });

  const porGrupo = new Map<string, LinhaLista[]>();
  const empurrar = (chave: string, linha: LinhaLista) => {
    const atual = porGrupo.get(chave) ?? [];
    atual.push(linha);
    porGrupo.set(chave, atual);
  };

  for (const a of ativos) {
    // ACEITO segue sendo Sugestão na tela (badge, grupo, explicação) — o
    // aceite implícito só a protege do recálculo (ADR-026).
    const ehSugestao = a.origem === "SUGESTAO";
    const qtd = a.qtdSugerida != null ? Number(a.qtdSugerida) : 1;
    const unidade = a.item.unidadePadrao ?? "un";

    // Regenera microcópia E motivo pelo motor: assim grupo e texto vêm da MESMA
    // avaliação (com `hoje` atual) e nunca divergem. O `motivo` persistido é só
    // cache; ex.: um RECORRENTE que passou do intervalo é promovido a acabando.
    let resumo = "";
    let explicacao = "";
    let motivoEfetivo = a.motivo;
    if (ehSugestao) {
      const historico = historicos.get(a.itemId);
      const sug = historico ? gerarSugestao(historico, hoje) : null;
      if (sug) {
        resumo = sug.resumo;
        explicacao = sug.explicacao;
        motivoEfetivo = sug.motivo;
      }
    }

    const linha: LinhaLista = {
      listaItemId: a.id,
      itemId: a.itemId,
      nome: a.item.nomeCanonico,
      ehSugestao,
      badge: ehSugestao ? "🤖" : "✋",
      qtd,
      unidade,
      resumo,
      explicacao,
    };

    if (ehSugestao && motivoEfetivo === "PROVAVELMENTE_ACABANDO") empurrar("acabando", linha);
    else if (ehSugestao && motivoEfetivo === "RECORRENTE") empurrar("recorrente", linha);
    else empurrar("adicionou", linha);
  }

  return GRUPOS.map((g) => ({
    chave: g.chave,
    titulo: g.titulo,
    itens: porGrupo.get(g.chave) ?? [],
  })).filter((g) => g.itens.length > 0);
}
