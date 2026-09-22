import Image from "next/image";

/** Moldura das telas de acesso: logo do colégio e um cartão centralizado. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Image
        src="/brand/logo-ibpi.png"
        alt="Colégio IBPI"
        width={220}
        height={100}
        priority
        className="mx-auto mb-8 h-auto w-52"
      />
      <div className="rounded-card border-line bg-surface border p-6">
        {children}
      </div>
    </main>
  );
}
