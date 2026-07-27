"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { LinhaDeslizavel } from "@/shared/ui/LinhaDeslizavel";
import { SheetAdicionarItem } from "@/shared/ui/SheetAdicionarItem";
import { IconeMais, IconeMenos, IconeInfo } from "@/shared/ui/icones";
import type { GrupoLista, LinhaLista } from "@/modules/lista/services/montarLista";
import {
  descartarAction,
  editarQtdAction,
  adicionarItemAction,
} from "./actions";

export function ListaConteudo({ grupos }: { grupos: GrupoLista[] }) {
  const [sheet, setSheet] = useState<LinhaLista | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [qtdLocal, setQtdLocal] = useState<Record<string, number>>({});
  const [, iniciar] = useTransition();

  const temSugestao = grupos.some((g) => g.itens.some((i) => i.ehSugestao));

  function qtdDe(linha: LinhaLista) {
    return qtdLocal[linha.listaItemId] ?? linha.qtd;
  }

  function mudarQtd(linha: LinhaLista, delta: number) {
    const nova = Math.max(1, qtdDe(linha) + delta);
    setQtdLocal((m) => ({ ...m, [linha.listaItemId]: nova }));
    iniciar(() => {
      editarQtdAction(linha.listaItemId, nova);
    });
  }

  function descartar(id: string) {
    setSheet(null);
    iniciar(() => {
      descartarAction(id);
    });
  }

  function adicionar(nome: string) {
    setAddOpen(false);
    iniciar(() => {
      adicionarItemAction(nome);
    });
  }

  return (
    <>
      {temSugestao && (
        <div
          className="mt-3.5 mb-1 flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
          style={{
            background: "color-mix(in srgb, var(--color-acento) 7%, #fff)",
            border: "1px solid color-mix(in srgb, var(--color-acento) 16%, #fff)",
          }}
        >
          <span className="text-[18px] leading-tight">🤖</span>
          <span className="text-[13.5px] font-semibold leading-snug text-[#544d8f]">
            Separei o que provavelmente está faltando. Deslize pra tirar o que
            não precisar.
          </span>
        </div>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.chave} className="mt-5">
          <div className="mb-2.5 pl-0.5 text-[12.5px] font-bold uppercase tracking-wide text-suave-2">
            {grupo.titulo}
          </div>
          <div className="flex flex-col gap-2.5">
            {grupo.itens.map((linha) => (
              <LinhaDeslizavel
                key={linha.listaItemId}
                aoDispensar={() => descartar(linha.listaItemId)}
                className={
                  linha.ehSugestao
                    ? "rounded-[18px] border p-3.5"
                    : "rounded-[18px] border border-borda bg-superficie p-3.5"
                }
                style={
                  linha.ehSugestao
                    ? {
                        background:
                          "color-mix(in srgb, var(--color-acento) 7%, #fff)",
                        borderColor:
                          "color-mix(in srgb, var(--color-acento) 18%, #fff)",
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  {/* Tocar no item abre a explicação da Sugestão (ADR-008). */}
                  <button
                    type="button"
                    onClick={() => linha.ehSugestao && setSheet(linha)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    <span className="truncate text-[15.5px] font-bold text-tinta">
                      {linha.nome}
                    </span>
                    <span className="flex-none text-[12.5px] leading-none">
                      {linha.badge}
                    </span>
                  </button>

                  <div
                    className="flex flex-none items-center rounded-xl"
                    style={{
                      background: linha.ehSugestao ? "#fff" : "#f6f1ea",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => mudarQtd(linha, -1)}
                      aria-label="menos"
                      className="flex h-[34px] w-[34px] items-center justify-center text-[#6e665d]"
                    >
                      <IconeMenos tamanho={15} />
                    </button>
                    <span className="min-w-[58px] text-center text-[13.5px] font-bold text-tinta">
                      {qtdDe(linha)} {linha.unidade}
                    </span>
                    <button
                      type="button"
                      onClick={() => mudarQtd(linha, 1)}
                      aria-label="mais"
                      className="flex h-[34px] w-[34px] items-center justify-center text-[#6e665d]"
                    >
                      <IconeMais tamanho={15} />
                    </button>
                  </div>

                  {linha.ehSugestao && (
                    <button
                      type="button"
                      onClick={() => setSheet(linha)}
                      aria-label="Ver explicação"
                      className="flex h-[34px] w-[30px] flex-none items-center justify-center text-[#b6ada0]"
                    >
                      <IconeInfo tamanho={18} />
                    </button>
                  )}
                </div>
              </LinhaDeslizavel>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-superficie px-4 py-4 text-[15px] font-bold text-acento"
        style={{
          border: "1.5px dashed color-mix(in srgb, var(--color-acento) 35%, #fff)",
        }}
      >
        <IconeMais tamanho={17} strokeWidth={2.4} />
        Adicionar item
      </button>

      {/* Saída para o mercado (ADR-015): executar a compra por prateleira. */}
      <Link
        href="/mercado"
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-borda bg-superficie px-4 py-4 text-[15px] font-bold text-acento"
      >
        <span className="text-[17px]">🛒</span>
        Modo Mercado
      </Link>

      {/* Explicação da Sugestão (ADR-008): ações no próprio drawer */}
      <BottomSheet
        aberto={sheet !== null}
        aoFechar={() => setSheet(null)}
        ariaLabel={sheet ? `${sheet.nome} — sugestão` : undefined}
      >
        {sheet && (
          <>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[22px] font-extrabold tracking-tight text-tinta">
                {sheet.nome}
              </span>
              <span className="text-[16px]">{sheet.badge}</span>
            </div>
            <div
              className="mb-3.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-bold text-acento"
              style={{
                background: "color-mix(in srgb, var(--color-acento) 9%, #fff)",
              }}
            >
              Sugestão · {sheet.resumo}
            </div>
            <p className="mb-5 text-[15.5px] leading-relaxed text-[#544e45]">
              {sheet.explicacao}
            </p>
            <button
              type="button"
              onClick={() => descartar(sheet.listaItemId)}
              className="w-full rounded-[15px] bg-[#f4efe7] px-4 py-4 text-[15.5px] font-bold text-[#6e665d]"
            >
              Dispensar da Lista
            </button>
          </>
        )}
      </BottomSheet>

      {/* Adicionar item manual (ADR-003) */}
      <SheetAdicionarItem
        aberto={addOpen}
        aoFechar={() => setAddOpen(false)}
        aoAdicionar={adicionar}
      />
    </>
  );
}
