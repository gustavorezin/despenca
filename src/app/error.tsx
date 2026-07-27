"use client";

import Link from "next/link";

/**
 * Fronteira de erro global (ADR-012, por extensão: nenhuma tela sem saída).
 * Erros não tratados de render ou de Server Action caem aqui com um caminho
 * de recuperação, no tom do app. Em produção o Next redige a mensagem
 * original do servidor — por isso o texto é genérico e acolhedor.
 */
export default function Erro({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-8 py-16 text-center md:max-w-3xl">
      <div
        className="mb-6 flex items-center justify-center rounded-[32px] text-[52px]"
        style={{
          width: 108,
          height: 108,
          background: "color-mix(in srgb, var(--color-acento) 10%, #fff)",
        }}
      >
        😅
      </div>
      <h1 className="mb-2 text-[21px] font-extrabold tracking-tight text-tinta">
        Algo deu errado por aqui
      </h1>
      <p className="mb-7 max-w-[300px] text-[15px] leading-normal text-suave">
        Não foi culpa sua. Tente de novo — se não resolver, volte para a Lista
        que eu me reorganizo.
      </p>
      <button
        type="button"
        onClick={reset}
        className="w-full rounded-2xl bg-acento px-4 py-4 text-[16px] font-bold text-white"
        style={{
          boxShadow:
            "0 10px 22px color-mix(in srgb, var(--color-acento) 30%, transparent)",
        }}
      >
        Tentar novamente
      </button>
      <Link
        href="/lista"
        className="mt-3 w-full rounded-2xl border border-borda bg-superficie px-4 py-4 text-[15px] font-bold text-tinta"
      >
        Ir para a Lista
      </Link>
    </main>
  );
}
