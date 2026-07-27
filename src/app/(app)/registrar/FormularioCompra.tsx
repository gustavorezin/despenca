"use client";

import { useState, useTransition } from "react";
import type { EntradaCompra } from "@/modules/compra/services/entradaCompra";
import { comoUnidade, type Unidade } from "@/modules/item/domain/unidades";
import { comoCategoria, type Categoria } from "@/modules/item/domain/categorias";
import { dataISOLocal } from "@/shared/utils/data";
import { useBuscaItens, type ItemBusca } from "@/shared/ui/useBuscaItens";
import { DetalheItemSheet } from "./DetalheItemSheet";
import { IconeX, IconeLupa, IconeMais, IconeMenos } from "@/shared/ui/icones";

export type ChipCompra = {
  nome: string;
  quantidade: number;
  unidade?: Unidade;
  categoria?: Categoria;
};

/**
 * Formulário de Compra (ADR-005/ADR-021/ADR-022), compartilhado entre
 * registrar e editar: busca com autocomplete + descrição/data discretas +
 * chips com bottom sheet de detalhes (quantidade, unidade, categoria).
 */
export function FormularioCompra({
  inicial,
  rotuloConfirmar,
  rotuloEnviando,
  aoConfirmar,
}: {
  inicial?: { descricao?: string; dataISO?: string; itens: ChipCompra[] };
  rotuloConfirmar: string;
  rotuloEnviando: string;
  aoConfirmar: (entrada: EntradaCompra) => Promise<void>;
}) {
  const hojeISO = dataISOLocal(new Date());
  const { termo, setTermo, sugestoes, limpar } = useBuscaItens();
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [dataISO, setDataISO] = useState(inicial?.dataISO ?? hojeISO);
  const [chips, setChips] = useState<ChipCompra[]>(inicial?.itens ?? []);
  const [chipAberto, setChipAberto] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const jaAdicionado = (nome: string) =>
    chips.some((c) => c.nome.toLowerCase() === nome.toLowerCase());

  const sugestoesFiltradas = sugestoes.filter(
    (s) => !jaAdicionado(s.nomeCanonico),
  );
  const semResultados =
    termo.trim().length >= 2 && sugestoesFiltradas.length === 0;

  // Chip vindo do autocomplete nasce com a classificação atual do Item.
  function adicionar(nome: string, item?: ItemBusca) {
    const limpo = nome.trim();
    if (!limpo || jaAdicionado(limpo)) {
      limpar();
      return;
    }
    setChips((cs) => [
      ...cs,
      {
        nome: limpo,
        quantidade: 1,
        unidade: comoUnidade(item?.unidadePadrao),
        categoria: comoCategoria(item?.categoria),
      },
    ]);
    limpar();
  }

  function alterarChip(nome: string, mudancas: Partial<ChipCompra>) {
    setChips((cs) =>
      cs.map((c) => (c.nome === nome ? { ...c, ...mudancas } : c)),
    );
  }

  function ajustarQtd(nome: string, delta: number) {
    setChips((cs) =>
      cs.map((c) =>
        c.nome === nome
          ? { ...c, quantidade: Math.max(1, c.quantidade + delta) }
          : c,
      ),
    );
  }

  function remover(nome: string) {
    setChips((cs) => cs.filter((c) => c.nome !== nome));
  }

  function confirmar() {
    if (!chips.length) return;
    iniciar(async () => {
      await aoConfirmar({
        descricao: descricao.trim() || undefined,
        data: dataISO,
        itens: chips,
      });
    });
  }

  const aberto = chipAberto
    ? (chips.find((c) => c.nome === chipAberto) ?? null)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5.5 pt-2">
        {/* Nome e data da Compra: opcionais e ignoráveis (ADR-021). */}
        <div className="mb-2 flex gap-2">
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={80}
            placeholder="Nome da Compra (opcional)"
            title="Ex.: Mercado Extra, churrasco de sábado…"
            className="min-w-0 flex-1 rounded-[13px] border border-borda bg-superficie px-3 py-2.5 text-[14px] text-tinta outline-none placeholder:text-suave-2 focus:border-acento"
          />
          <input
            type="date"
            value={dataISO}
            max={hojeISO}
            onChange={(e) => setDataISO(e.target.value || hojeISO)}
            aria-label="Data da Compra"
            className="rounded-[13px] border border-borda bg-superficie px-3 py-2.5 text-[14px] text-suave outline-none focus:border-acento"
          />
        </div>

        <div className="flex items-center gap-2.5 rounded-[15px] border-[1.5px] border-borda-forte bg-superficie px-3.5 py-3 focus-within:border-acento">
          <span className="text-suave-2">
            <IconeLupa tamanho={19} />
          </span>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar item para adicionar…"
            autoFocus={!inicial}
            className="flex-1 bg-transparent text-[16px] text-tinta outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5.5 pt-2">
        {sugestoesFiltradas.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => adicionar(s.nomeCanonico, s)}
            className="mb-2 flex w-full items-center justify-between gap-2.5 rounded-[14px] border border-borda bg-superficie p-3.5 text-left"
          >
            <span>
              <span className="block text-[15px] font-bold text-tinta">
                {s.nomeCanonico}
              </span>
              {s.categoria && (
                <span className="mt-px block text-[12px] text-suave-2">
                  {s.categoria}
                </span>
              )}
            </span>
            <span className="flex text-acento">
              <IconeMais tamanho={20} strokeWidth={2.3} />
            </span>
          </button>
        ))}

        {semResultados && (
          <button
            type="button"
            onClick={() => adicionar(termo)}
            className="flex w-full items-center gap-2.5 rounded-[14px] bg-superficie p-3.5 text-left text-[14.5px] font-bold text-acento"
            style={{
              border:
                "1.5px dashed color-mix(in srgb, var(--color-acento) 32%, #fff)",
            }}
          >
            <IconeMais tamanho={18} strokeWidth={2.3} />
            Adicionar “{termo.trim()}”
          </button>
        )}

        {chips.length > 0 ? (
          <>
            <div className="mb-2.5 mt-4.5 text-[12.5px] font-bold uppercase tracking-wide text-suave-2">
              Nesta Compra · {chips.length}
            </div>
            <div className="flex flex-col gap-2 pb-2">
              {chips.map((c) => (
                <div
                  key={c.nome}
                  className="flex items-center gap-2.5 rounded-[14px] py-2 pl-3.5 pr-2.5"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-acento) 6%, #fff)",
                    border:
                      "1px solid color-mix(in srgb, var(--color-acento) 16%, #fff)",
                  }}
                >
                  {/* Tocar no nome abre o detalhe (unidade/categoria) — ADR-022. */}
                  <button
                    type="button"
                    onClick={() => setChipAberto(c.nome)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[15px] font-bold text-tinta">
                      {c.nome}
                    </span>
                    {(c.unidade || c.categoria) && (
                      <span className="mt-px block truncate text-[12px] text-suave-2">
                        {[c.unidade, c.categoria].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                  <div
                    className="flex items-center rounded-[11px] bg-superficie"
                    style={{
                      border:
                        "1px solid color-mix(in srgb, var(--color-acento) 18%, #fff)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => ajustarQtd(c.nome, -1)}
                      aria-label="menos"
                      className="flex h-8 w-8 items-center justify-center text-[#6e665d]"
                    >
                      <IconeMenos tamanho={14} />
                    </button>
                    <span className="min-w-[26px] text-center text-[14px] font-bold text-tinta">
                      {c.quantidade}
                    </span>
                    <button
                      type="button"
                      onClick={() => ajustarQtd(c.nome, 1)}
                      aria-label="mais"
                      className="flex h-8 w-8 items-center justify-center text-[#6e665d]"
                    >
                      <IconeMais tamanho={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(c.nome)}
                    aria-label="Remover"
                    className="flex h-[30px] w-[30px] items-center justify-center text-suave-2"
                  >
                    <IconeX tamanho={15} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          !semResultados &&
          termo.trim().length < 2 && (
            <div className="px-2.5 py-8 text-center text-[13.5px] text-suave-2">
              Busque acima e toque para adicionar itens à Compra.
            </div>
          )
        )}
      </div>

      <div className="border-t border-[#eee8df] bg-fundo px-5.5 pb-7 pt-3">
        <button
          type="button"
          onClick={confirmar}
          disabled={chips.length === 0 || enviando}
          className="w-full rounded-2xl px-4 py-4 text-[16px] font-bold text-white transition-colors"
          style={{
            background: chips.length === 0 ? "#cfc7bb" : "var(--color-acento)",
          }}
        >
          {enviando
            ? rotuloEnviando
            : chips.length > 0
              ? `${rotuloConfirmar} · ${chips.length}`
              : rotuloConfirmar}
        </button>
      </div>

      <DetalheItemSheet
        chip={aberto}
        aoAlterar={(mudancas) => {
          if (chipAberto) alterarChip(chipAberto, mudancas);
        }}
        aoFechar={() => setChipAberto(null)}
      />
    </div>
  );
}
