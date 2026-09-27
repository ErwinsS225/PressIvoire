import Link from "next/link";
import { Screen, ScreenHeader, SectionTitle } from "@/components/mobile/screen";
import { Avatar } from "@/components/mobile/avatar";
import { getContext, getNotificationCounts } from "@/lib/supabase/queries";
import { isAdminRole, isStaffRole, roleLabel } from "@/lib/constants";
import { staggerStyle } from "@/lib/utils";

export const metadata = { title: "Plus" };

/**
 * Hub des modules.
 *
 * La barre de navigation du bas ne peut porter que quatre destinations sans
 * devenir illisible au pouce. Le pressing en compte huit : plutot que
 * d'entasser des onglets, les modules secondaires vivent ici, avec les
 * compteurs qui donnent une raison d'y aller.
 *
 * Les entrees sont filtrees par role : un livreur n'a rien a faire dans le
 * catalogue, et lui montrer un lien qu'il ne peut pas utiliser n'aide pas.
 */
export default async function PlusPage() {
  const { pressing, profile } = await getContext();

  if (!pressing) {
    return (
      <Screen>
        <ScreenHeader title="Plus" />
      </Screen>
    );
  }

  const counts = await getNotificationCounts(pressing.id);

  const operations = [
    {
      href: "/caisse",
      icon: "💰",
      label: "Caisse",
      hint: "Encaissements et soldes du jour",
      color: "bg-emerald-50",
    },
    {
      href: "/livraisons",
      icon: "🚚",
      label: "Tournées",
      hint: "À remettre et à collecter",
      color: "bg-violet-50",
    },
    {
      href: "/clients",
      icon: "👥",
      label: "Clients",
      hint: "Fiches, historiques et forfaits",
      color: "bg-sky-50",
    },
  ];

  const pilotage = [
    {
      href: "/rapports",
      icon: "📊",
      label: "Rapports",
      hint: "Activité sur 7 jours",
      color: "bg-blue-50",
    },
    {
      href: "/notifications",
      icon: "🔔",
      label: "Notifications",
      hint: "File d'envoi SMS et WhatsApp",
      color: "bg-orange-50",
      badge: counts.queued + counts.failed > 0 ? counts.queued + counts.failed : null,
    },
  ];

  const gestion = [
    {
      href: "/catalogue",
      icon: "🧺",
      label: "Catalogue",
      hint: "Articles, prix et délais",
      color: "bg-orange-50",
      staffOnly: true,
    },
    {
      href: "/reglages",
      icon: "⚙️",
      label: "Réglages",
      hint: "Pressing et abonnement",
      color: "bg-slate-100",
    },
  ];

  return (
    <Screen>
      <ScreenHeader title="Plus" subtitle={pressing.name} />

      <div className="space-y-5 px-5">
        {/* Carte d'identite du compte */}
        <div className="animate-slide-up flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
          <Avatar name={profile?.full_name ?? "Utilisateur"} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {profile?.full_name ?? "Utilisateur"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {roleLabel(profile?.role)} · {pressing.commune}
            </p>
          </div>
          {isAdminRole(profile?.role) ? (
            <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700">
              Admin
            </span>
          ) : null}
        </div>

        <ModuleGroup title="Opérations" modules={operations} />

        <ModuleGroup title="Pilotage" modules={pilotage} />

        <ModuleGroup
          title="Gestion"
          modules={gestion.filter((module) => !module.staffOnly || isStaffRole(profile?.role))}
        />

        <p className="pb-2 text-center text-[11px] text-slate-300">
          PressingPro · {roleLabel(profile?.role)}
        </p>
      </div>
    </Screen>
  );
}

/** Groupe de modules, avec compteur optionnel. */
function ModuleGroup({
  title,
  modules,
}: {
  title: string;
  modules: {
    href: string;
    icon: string;
    label: string;
    hint: string;
    color: string;
    badge?: number | null;
  }[];
}) {
  if (modules.length === 0) return null;

  return (
    <section>
      <SectionTitle>{title}</SectionTitle>

      <div className="space-y-2">
        {modules.map((module, index) => (
          <Link
            key={module.href}
            href={module.href}
            className="stagger-item card-hover flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
            style={staggerStyle(index)}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${module.color}`}
              aria-hidden
            >
              {module.icon}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{module.label}</p>
              <p className="truncate text-xs text-slate-500">{module.hint}</p>
            </div>

            {module.badge ? (
              <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                {module.badge}
              </span>
            ) : null}

            <span className="shrink-0 text-slate-300" aria-hidden>
              &rarr;
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
