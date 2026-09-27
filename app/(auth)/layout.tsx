import { AuthLogo, BrandPanel } from "@/components/auth/brand-panel";

/**
 * Layout des ecrans d'authentification.
 *
 * Ecran scindé (cf. SignUpIN.md § 2) : panneau de marque à gauche, formulaire
 * à droite, sur une carte posée sur un fond doux. L'utilisateur est ici hors de
 * l'application de gestion — on ne lui montre donc aucune navigation metier.
 *
 * Sous 1024 px le panneau s'efface et la colonne formulaire occupe toute la
 * largeur : sur un telephone, un decor sur la moitie de l'ecran vole de la
 * place au contenu utile.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-brand-900 via-slate-900 to-brand-950">
      {/*
       * Aurore : les taches colorees que le verre va refracter. Sans elles, un
       * `backdrop-filter` n'a rien a flouter et l'effet est invisible.
       */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="aurora aurora-1 -left-20 -top-24 h-[28rem] w-[28rem] bg-brand-500/40" />
        <span className="aurora aurora-2 -right-16 top-1/4 h-[24rem] w-[24rem] bg-flag-500/30" />
        <span className="aurora aurora-3 bottom-0 left-1/3 h-[22rem] w-[22rem] bg-sky-400/25" />
      </div>

      {/* Scene 3D : donne la perspective dont la carte a besoin pour incliner. */}
      <div className="scene-3d relative flex min-h-dvh items-center justify-center p-4">
        {/*
         * `flex` sur la carte est indispensable : sans lui, les deux colonnes
         * (`w-1/2` chacune) s'empilent en `display: block` au lieu d'etre
         * posees cote a cote — le formulaire passait alors sous le panneau de
         * marque, hors de l'ecran.
         */}
        <div className="float-3d glass-panel glass-sheen flex w-full max-w-6xl overflow-hidden rounded-[2rem]">
          <BrandPanel />

          {/*
           * Fond quasi opaque, et non le verre translucide de la carte : sur un
           * fond clair, le texte gris pale des libelles devenait presque
           * invisible. Le verre reste sur le panneau de marque, la ou le texte
           * blanc contraste correctement.
           */}
          <div className="flex w-full items-center justify-center bg-white/95 p-6 sm:p-12 lg:w-1/2">
            <div className="w-full max-w-md">
              {/* Logo mobile : sur grand ecran, le panneau de marque prend la place. */}
              <AuthLogo />

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
