"use client";

import { useEffect, useState } from "react";

/** Item da Casa devolvido por GET /api/itens (autocomplete, ADR-005). */
export type ItemBusca = {
  id: string;
  nomeCanonico: string;
  categoria: string | null;
  unidadePadrao: string | null;
};

/**
 * Autocomplete de Itens da Casa (ADR-005): consulta /api/itens a partir do 2º
 * caractere, com debounce e cancelamento. `ativo` pausa a busca (ex.: enquanto
 * o bottom sheet está fechado). Único ponto com essa lógica — usado no
 * registro de Compra, na Lista e no Modo Mercado.
 */
export function useBuscaItens(ativo = true) {
  const [termo, setTermo] = useState("");
  const [sugestoes, setSugestoes] = useState<ItemBusca[]>([]);

  useEffect(() => {
    if (!ativo) return;
    const q = termo.trim();
    const controlador = new AbortController();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setSugestoes([]);
        return;
      }
      try {
        const res = await fetch(`/api/itens?termo=${encodeURIComponent(q)}`, {
          signal: controlador.signal,
        });
        const dados = await res.json();
        setSugestoes(dados.itens ?? []);
      } catch {
        /* aborto ou rede — ignora */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      controlador.abort();
    };
  }, [termo, ativo]);

  /** Zera termo e resultados (ao fechar o sheet ou concluir uma adição). */
  function limpar() {
    setTermo("");
    setSugestoes([]);
  }

  return { termo, setTermo, sugestoes, limpar };
}
