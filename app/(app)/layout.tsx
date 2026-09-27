import { BottomNav } from "@/components/mobile/bottom-nav";

/**
 * Coque de l'application de pressing.
 *
 * L'interface de la maquette est concue pour un telephone. Sur grand ecran on
 * la centre dans un cadre de maquette pour ne pas étirer les cartes sur 27
 * pouces ; sur mobile elle occupe tout l'ecran.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-slate-100">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-white md:h-[780px] md:my-8 md:rounded-[2.5rem] md:shadow-[0_50px_100px_-20px_rgba(15,23,42,0.25),0_30px_60px_-30px_rgba(15,23,42,0.3)]">
        {/* Zone de contenu : elle seule defile, la barre basse reste fixee. */}
        <div className="min-h-0 flex-1">{children}</div>

        <BottomNav />
      </div>
    </div>
  );
}
