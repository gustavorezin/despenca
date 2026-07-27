"use client";

import { useEffect, useRef } from "react";

const FOCAVEIS =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet reutilizável (spec-design §5.2): backdrop + painel slide-up que
 * fecha ao tocar fora ou com Esc. Modal de verdade para o teclado: o foco
 * entra no painel ao abrir (sem roubar de um campo com autoFocus), Tab circula
 * dentro dele e o foco volta ao elemento de origem ao fechar.
 */
export function BottomSheet({
  aberto,
  aoFechar,
  ariaLabel = "Ações",
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Nome acessível do diálogo (lido por leitores de tela). */
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const painelRef = useRef<HTMLDivElement>(null);

  // Os callers passam `aoFechar` inline; o ref evita religar o efeito (e
  // refocar o painel) a cada render enquanto o sheet está aberto.
  const aoFecharRef = useRef(aoFechar);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  });

  useEffect(() => {
    if (!aberto) return;

    const origem = document.activeElement as HTMLElement | null;
    const painel = painelRef.current;
    if (painel && !painel.contains(document.activeElement)) {
      painel.focus();
    }

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFecharRef.current();
        return;
      }
      if (e.key !== "Tab" || !painelRef.current) return;

      // Círculo de foco dentro do painel (Tab no último volta ao primeiro).
      const focaveis = painelRef.current.querySelectorAll<HTMLElement>(FOCAVEIS);
      if (focaveis.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      if (e.shiftKey && (atual === primeiro || atual === painelRef.current)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      origem?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <>
      <div
        onClick={aoFechar}
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(35,28,20,.42)",
          animation: "despensa-fade-in .18s ease",
        }}
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md bg-fundo px-5.5 pb-7 pt-2.5 outline-none"
        style={{
          borderRadius: "28px 28px 0 0",
          animation: "despensa-slide-up .24s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-[#e2dbd0]" />
        {children}
      </div>
    </>
  );
}
