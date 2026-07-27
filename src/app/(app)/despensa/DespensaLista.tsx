"use client";

import { useState, useTransition } from "react";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { SeletorClassificacao } from "@/shared/ui/SeletorClassificacao";
import { IconeInfo, IconeMais, IconeMenos } from "@/shared/ui/icones";
import type {
  GrupoDespensa,
  LinhaDespensa,
} from "@/modules/despensa/services/listarDespensa";
import type { NivelConfianca } from "@/modules/aprendizado/domain/estimativa";
import { comoUnidade, type Unidade } from "@/modules/item/domain/unidades";
import {
  comoCategoria,
  type Categoria,
} from "@/modules/item/domain/categorias";
import { ajustarDespensaAction, classificarItemAction } from "./actions";

const COR: Record<NivelConfianca, string> = {
  alta: "#2E9E6B",
  media: "#E0A11A",
  baixa: "#D7553B",
};
const ANEL: Record<NivelConfianca, string> = {
  alta: "rgba(46,158,107,.14)",
  media: "rgba(224,161,26,.16)",
  baixa: "rgba(215,85,59,.16)",
};

type SheetEstado =
  | (LinhaDespensa & { modo: "ajuste" | "estimativa" })
  | null;

export function DespensaLista({ grupos }: { grupos: GrupoDespensa[] }) {
  const [sheet, setSheet] = useState<SheetEstado>(null);
  const [precisoAberto, setPrecisoAberto] = useState(false);
  const [classificacaoAberta, setClassificacaoAberta] = useState(false);
  const [pq, setPq] = useState(1);
  const [, iniciar] = useTransition();

  function abrir(item: LinhaDespensa, modo: "ajuste" | "estimativa") {
    setPrecisoAberto(false);
    setClassificacaoAberta(false);
    setPq(1);
    setSheet({ ...item, modo });
  }

  function aplicar(tipo: "TEM" | "POUCO" | "ACABOU" | "PRECISO", valor?: number) {
    if (!sheet) return;
    const itemId = sheet.itemId;
    setSheet(null);
    setPrecisoAberto(false);
    iniciar(() => {
      ajustarDespensaAction({ itemId, tipo, valor });
    });
  }

  // Edição da classificação do Item pela Despensa (ADR-022): atualiza o sheet
  // na hora (otimista) e persiste; a revalidação reagrupa a tela.
  function classificar(mudancas: {
    unidade?: Unidade | null;
    categoria?: Categoria | null;
  }) {
    if (!sheet) return;
    const itemId = sheet.itemId;
    setSheet({
      ...sheet,
      ...(mudancas.unidade !== undefined && { unidade: mudancas.unidade }),
      ...(mudancas.categoria !== undefined && {
        categoria: mudancas.categoria,
      }),
    });
    iniciar(() => {
      classificarItemAction({
        itemId,
        ...(mudancas.unidade !== undefined && {
          unidadePadrao: mudancas.unidade,
        }),
        ...(mudancas.categoria !== undefined && {
          categoria: mudancas.categoria,
        }),
      });
    });
  }

  return (
    <>
      {/* Legenda do semáforo */}
      <div className="mt-3.5 flex items-center gap-4 rounded-2xl border border-borda bg-superficie px-3.5 py-2.5">
        {(
          [
            ["alta", "Tenho"],
            ["media", "Talvez"],
            ["baixa", "No fim"],
          ] as const
        ).map(([nivel, rotulo]) => (
          <span
            key={nivel}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6e665d]"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COR[nivel] }}
            />
            {rotulo}
          </span>
        ))}
      </div>

      {grupos.map((grupo) => (
        <div key={grupo.categoria} className="mt-5">
          <div className="mb-2.5 pl-0.5 text-[12.5px] font-bold uppercase tracking-wide text-suave-2">
            {grupo.categoria}
          </div>
          <div className="overflow-hidden rounded-[18px] border border-borda bg-superficie">
            {grupo.itens.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3.5"
                style={{
                  borderBottom:
                    idx === grupo.itens.length - 1 ? "none" : "1px solid #f4efe8",
                }}
              >
                <button
                  type="button"
                  onClick={() => abrir(item, "ajuste")}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className="h-3 w-3 flex-none rounded-full"
                    style={{
                      background: COR[item.nivel],
                      boxShadow: `0 0 0 3px ${ANEL[item.nivel]}`,
                    }}
                  />
                  <span className="text-[15.5px] font-bold text-tinta">
                    {item.nome}
                  </span>
                </button>
                <span className="text-[13px] font-semibold text-suave">
                  {item.qtyText}
                </span>
                <button
                  type="button"
                  onClick={() => abrir(item, "estimativa")}
                  aria-label="Detalhes"
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center text-[#c3bbaf]"
                >
                  <IconeInfo tamanho={17} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <BottomSheet
        aberto={sheet !== null}
        aoFechar={() => setSheet(null)}
        ariaLabel={sheet ? `${sheet.nome} — ajustar Despensa` : undefined}
      >
        {sheet && sheet.modo === "estimativa" && (
          <>
            <div className="mb-3.5 flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ background: COR[sheet.nivel] }}
              />
              <span className="text-[22px] font-extrabold tracking-tight text-tinta">
                {sheet.nome}
              </span>
            </div>
            <div className="mb-4 flex gap-5">
              <div>
                <div className="text-[11.5px] font-bold uppercase tracking-wide text-suave-2">
                  Estimativa
                </div>
                <div className="mt-1 text-[15px] font-bold text-tinta">
                  {sheet.qtyText}
                </div>
              </div>
              <div>
                <div className="text-[11.5px] font-bold uppercase tracking-wide text-suave-2">
                  Última compra
                </div>
                <div className="mt-1 text-[15px] font-bold text-tinta">
                  {sheet.ultimaCompraLabel}
                </div>
              </div>
            </div>
            <p className="mb-5 text-[15.5px] leading-relaxed text-[#544e45]">
              {sheet.explicacao}
            </p>
            <button
              type="button"
              onClick={() => setSheet({ ...sheet, modo: "ajuste" })}
              className="w-full rounded-[15px] bg-acento px-4 py-4 text-[15.5px] font-bold text-white"
            >
              Ajustar Despensa
            </button>
          </>
        )}

        {sheet && sheet.modo === "ajuste" && (
          <>
            <div className="flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ background: COR[sheet.nivel] }}
              />
              <span className="text-[22px] font-extrabold tracking-tight text-tinta">
                {sheet.nome}
              </span>
            </div>
            <div className="mb-4.5 pl-6 text-[13.5px] font-semibold text-suave">
              Estimativa atual: {sheet.qtyText}
            </div>

            <div className="mb-3.5 flex gap-2.5">
              {(
                [
                  ["TEM", "✅", "Tem", "confirma"],
                  ["POUCO", "🤏", "Pouco", "reduz"],
                  ["ACABOU", "🚫", "Acabou", "zera"],
                ] as const
              ).map(([tipo, emoji, rotulo, sub]) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => aplicar(tipo)}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-[#eae3d8] bg-superficie px-1.5 py-4"
                >
                  <span className="text-[22px]">{emoji}</span>
                  <span className="text-[14.5px] font-bold text-tinta">
                    {rotulo}
                  </span>
                  <span className="text-[11px] text-suave-2">{sub}</span>
                </button>
              ))}
            </div>

            {!precisoAberto ? (
              <button
                type="button"
                onClick={() => setPrecisoAberto(true)}
                className="w-full py-2 text-center text-[14px] font-semibold text-suave"
              >
                Ajuste preciso
              </button>
            ) : (
              <div className="mt-1 rounded-[16px] border border-borda bg-superficie p-4">
                <div className="mb-3 text-center text-[13px] font-bold text-[#6e665d]">
                  Quantas unidades você tem?
                </div>
                <div className="mb-3.5 flex items-center justify-center gap-4.5">
                  <button
                    type="button"
                    onClick={() => setPq((n) => Math.max(0, n - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] border-[1.5px] border-[#eae3d8] bg-fundo text-tinta"
                    aria-label="menos"
                  >
                    <IconeMenos tamanho={18} />
                  </button>
                  <span className="min-w-[54px] text-center text-[30px] font-extrabold text-tinta">
                    {pq}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPq((n) => n + 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] border-[1.5px] border-[#eae3d8] bg-fundo text-tinta"
                    aria-label="mais"
                  >
                    <IconeMais tamanho={18} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => aplicar("PRECISO", pq)}
                  className="w-full rounded-[13px] bg-acento px-4 py-3.5 text-[15px] font-bold text-white"
                >
                  Salvar quantidade
                </button>
              </div>
            )}

            {!classificacaoAberta ? (
              <button
                type="button"
                onClick={() => setClassificacaoAberta(true)}
                className="w-full py-2 text-center text-[14px] font-semibold text-suave"
              >
                Unidade e categoria
              </button>
            ) : (
              <div className="mt-1 rounded-[16px] border border-borda bg-superficie p-4">
                <SeletorClassificacao
                  unidade={comoUnidade(sheet.unidade)}
                  categoria={comoCategoria(sheet.categoria)}
                  aoAlterar={classificar}
                />
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </>
  );
}
