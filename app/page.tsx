import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bike,
  CheckCircle2,
  MessageCircle,
  Shirt,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { staggerStyle } from "@/lib/utils";

export const metadata = {
  title: "PressingPro — Gestion de pressing en Côte d'Ivoire",
  description:
    "Gérez votre pressing depuis votre téléphone : commandes, tournées de livraison, encaissement mobile money, suivi des impayés et rapports.",
};

/**
 * Landing page publique de PressingPro.
 *
 * Sa seule fonction : expliquer en dix secondes ce que le produit fait et
 * renvoyer vers `/register`. L'argumentaire est tire du metier reel
 * (commandes, tournees, mobile money, catalogue) — aucune technologie n'est
 * citee : un gerant de pressing n'a pas a savoir que la base est chez
 * Supabase.
 *
 * Aucune requete n'est lancee : la page est statique et instantanee, ce qui
 * compte sur une connexion 3G.
 */

/** Les quatre actes du metier, dans l'ordre ou le gerant les vit. */
const STEPS = [
  {
    icon: Store,
    title: "Creez votre pressing",
    description:
      "Nom, commune, articles et prix. Le catalogue ivoirien est deja rempli : vous n'avez plus qu'a l'ajuster a votre tour.",
  },
  {
    icon: Shirt,
    title: "Saisissez les commandes",
    description:
      "Chemise, pagne, blouson : le prix et le delai viennent du catalogue. Le client sait immediatement ou en est son linge.",
  },
  {
    icon: Bike,
    title: "Les livreurs font les tournees",
    description:
      "Collectes et livraisons regroupees par zone. Chaque livreur voit sa tournee sur son telephone, sans vous appeler.",
  },
  {
    icon: Wallet,
    title: "Encaissez en mobile money",
    description:
      "Wave, Orange Money, MTN ou especes. Les impayes remontent seuls dans le tableau de bord, avec le reliquat exact.",
  },
];

/** Les modules reellement disponibles dans l'application. */
const FEATURES = [
  {
    icon: Shirt,
    title: "Catalogue et prix",
    description:
      "Chaque article avec son prix et son delai. Un prix modifie une fois, il s'applique partout.",
  },
  {
    icon: CheckCircle2,
    title: "Suivi des commandes",
    description:
      "Recue, lavee, seche, prete, livree. L'etape avance d'un geste, l'historique reste conserve.",
  },
  {
    icon: Bike,
    title: "Tournees de livraison",
    description:
      "Collectes et livraisons regroupees par zone, reparties entre les livreurs.",
  },
  {
    icon: Wallet,
    title: "Caisse et impayes",
    description:
      "Encaissements, acomptes et relances. Le solde du par commande reste toujours visible.",
  },
  {
    icon: BarChart3,
    title: "Rapports",
    description:
      "Chiffre d'affaires, panier moyen, articles les plus demandes, meilleurs clients.",
  },
  {
    icon: MessageCircle,
    title: "Notifications",
    description:
      "Le client est prevenu par WhatsApp quand sa commande est prete. Fini les appels pour demander ou en est le linge.",
  },
];

/** Chiffres d'accroche. */
const STATS = [
  { value: "30 s", label: "pour saisir une commande" },
  { value: "100 %", label: "des commandes tracees" },
  { value: "0", label: "cahier papier" },
];

/** Les questions que se pose un gerant avant de s'abonner. */
const FAQ = [
  {
    question: "Faut-il installer quelque chose ?",
    answer:
      "Non. L'application fonctionne depuis un navigateur, sur telephone comme sur ordinateur. Aucune installation, et vos livreurs n'ont besoin que d'un telephone.",
  },
  {
    question: "Mes donnees sont-elles partagees avec d'autres pressings ?",
    answer:
      "Jamais. Chaque pressing est cloisonne : un gerant ne voit que ses propres clients, ses commandes et ses chiffres. Cette separation est appliquee par la base elle-meme, pas seulement dans l'interface.",
  },
  {
    question: "Je suis tout seul, puis-je m'en servir ?",
    answer:
      "Oui. Le tableau de bord reste clair avec une seule commande par jour. La multiplicite des roles (gerant, caissier, livreur) ne sert que quand vous grossissez.",
  },
  {
    question: "Comment sont enregistres les paiements ?",
    answer:
      "La caisse accepte les reglements mobile money et especes, avec suivi des acomptes. Le solde restant du reste toujours visible sur la commande, ce qui evite les litiges a la livraison.",
  },
];

/**
 * Point d'entree public.
 *
 * Le middleware laisse passer `/` sans session (c'est la page a vendre le
 * produit), mais un gerant deja connecte n'a rien à y faire : on l'envoie
 * directement dans son tableau de bord. Le controle est fait ici plutot que
 * dans le middleware, qui n'a pas vocation a trainer une page de vente dans
 * ses regles de protection.
 */
export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader />

      <main>
        <Hero />
        <StatsBand />
        <Steps />
        <Features />
        <Faq />
        <ClosingCta />
      </main>

      <SiteFooter />
    </div>
  );
}

/** Logo : sigle "PP" sur degrade de marque. */
function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 text-sm font-black text-white shadow-sm ${className}`}
    >
      PP
    </span>
  );
}

/**
 * En-tete collant.
 *
 * Volontairement sans effet au defilement : mesurer la position demanderait du
 * JavaScript, alors qu'un simple `backdrop-blur` donne deja l'impression que la
 * page glisse sous la barre. Le contenu est court, l'ornement n'en vaut pas le
 * cout sur une connexion 3G.
 */
function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-lg font-black tracking-tight text-slate-900">
            PressingPro
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <a href="#etapes" className="transition hover:text-brand-700">
            Comment ça marche
          </a>
          <a href="#fonctionnalites" className="transition hover:text-brand-700">
            Fonctionnalités
          </a>
          <Link href="/login" className="transition hover:text-brand-700">
            Connexion
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">
              Créer mon pressing
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * Hero.
 *
 * L'illustration de droite est construite en HTML/CSS et non en image : elle
 * reste nette sur tous les ecrans, ne coute aucun requete, et suit la charte
 * automatiquement. Elle represente l'ecran que le gerant verra le plus
 * souvent, ce qui vaut mieux qu'une illustration generique.
 */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Halos de fond : deux taches de couleur tres floues derriere le texte. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-100 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-flag-50 blur-3xl"
      />

      <div className="container relative grid items-center gap-14 py-16 md:py-24 lg:grid-cols-2">
        <div>
          <span
            className="stagger-item inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-700"
            style={staggerStyle(0)}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Conçu pour la Côte d&apos;Ivoire
          </span>

          <h1 className="stagger-item mt-5 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl" style={staggerStyle(1)}>
            Gérez votre pressing
            <br />
            <span className="text-brand-700">depuis votre téléphone</span>
          </h1>

          <p
            className="stagger-item mt-5 max-w-lg text-base leading-relaxed text-slate-600"
            style={staggerStyle(2)}
          >
            Commandes, tournées de livraison, encaissement mobile money et
            suivi des impayés : tout votre pressing tient dans une seule
            application, utilisable par vous et par vos livreurs.
          </p>

          <div
            className="stagger-item mt-8 flex flex-col gap-3 sm:flex-row"
            style={staggerStyle(3)}
          >
            <Button asChild size="lg" className="btn-press h-12 rounded-xl px-6">
              <Link href="/register">
                Créer mon pressing
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="btn-press h-12 rounded-xl px-6"
            >
              <Link href="/login">J&apos;ai déjà un compte</Link>
            </Button>
          </div>

          <p
            className="stagger-item mt-4 text-xs text-slate-400"
            style={staggerStyle(4)}
          >
            Installation en 5 minutes · Sans engagement
          </p>
        </div>

        <PhonePreview />
      </div>
    </section>
  );
}

/**
 * Apercu de l'application dans un telephone qui flotte.
 *
 * Le contenu reprend les vrais libelles et les vrais montants du tableau de
 * bord : une illustration generique decourage moins, mais une capture qui
 * n'existe pas encore ne prouverait rien. Les donnees sont en dur — c'est de
 * la decoration, pas une demonstration.
 */
function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[320px] lg:max-w-none">
      {/* Halo derriere l'ecran : detache le telephone du fond blanc. */}
      <div
        aria-hidden
        className="absolute inset-8 rounded-[2.5rem] bg-gradient-to-br from-brand-200/50 to-flag-200/40 blur-2xl"
      />

      <div className="float-slow relative rounded-[2.25rem] border-[6px] border-slate-900 bg-white shadow-2xl shadow-slate-900/20">
        {/* Encoche : purely decorative. */}
        <div
          aria-hidden
          className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900"
        />

        <div className="overflow-hidden rounded-[1.75rem] bg-slate-50 p-4 pt-8">
          {/* En-tete */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-slate-400">Bonjour Kadiatou</p>
              <p className="text-sm font-black text-slate-900">Lepressing Kappa</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              KK
            </span>
          </div>

          {/* Carte du chiffre d'affaires */}
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white shadow-lg shadow-brand-900/20">
            <p className="text-[10px] font-medium text-brand-100/80">
              Recettes du jour
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight">128 500 F</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-brand-100">
              <span className="rounded-full bg-white/20 px-1.5 py-0.5">
                +12 % vs hier
              </span>
            </div>
          </div>

          {/* Compteurs */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PreviewStat value="8" label="À livrer" color="bg-flag-50 text-flag-600" />
            <PreviewStat value="3" label="En cours" color="bg-violet-50 text-violet-600" />
          </div>

          {/* Liste de commandes */}
          <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Commandes du jour
          </p>

          <ul className="mt-2 space-y-2">
            <PreviewRow
              initials="AT"
              name="Awa Traoré"
              amount="7 500 F"
              status="Prête"
              statusClass="bg-emerald-100 text-emerald-700"
            />
            <PreviewRow
              initials="KM"
              name="Kouassi Mensah"
              amount="12 000 F"
              status="En lavage"
              statusClass="bg-blue-100 text-blue-700"
            />
            <PreviewRow
              initials="FK"
              name="Fatou Kone"
              amount="3 500 F"
              status="À collecter"
              statusClass="bg-flag-50 text-flag-600"
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Petit compteur du telephone. */
function PreviewStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className={`inline-flex rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${color}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

/** Ligne de commande du telephone. */
function PreviewRow({
  initials,
  name,
  amount,
  status,
  statusClass,
}: {
  initials: string;
  name: string;
  amount: string;
  status: string;
  statusClass: string;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-slate-900">{name}</p>
        <p className="text-[10px] text-slate-500">{amount}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusClass}`}
      >
        {status}
      </span>
    </li>
  );
}

/** Chiffres d'accroche, entre le hero et le parcours. */
function StatsBand() {
  return (
    <section className="border-y border-slate-100 bg-slate-50">
      <div className="container grid grid-cols-1 gap-8 py-10 sm:grid-cols-3">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className="stagger-item text-center"
            style={staggerStyle(index)}
          >
            <p className="text-3xl font-black tracking-tight text-brand-700">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Parcours en quatre temps.
 *
 * L'ordre n'est pas decoratif : c'est exactement la sequence que vit le
 * gerant. Chaque etape est numerotee, ce qui rend la progression lisible
 * immediatement.
 */
function Steps() {
  return (
    <section id="etapes" className="scroll-mt-20 py-20">
      <div className="container">
        <SectionHeading
          eyebrow="En pratique"
          title="Quatre étapes, et votre pressing tourne"
          subtitle="Pas de jargon, pas de formation. Vous ouvrez l'application, vous saisissez, vous livrez."
        />

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="stagger-item relative"
              style={staggerStyle(index)}
            >
              {/* Trait de liaison entre les etapes, masque sur la derniere. */}
              {index < STEPS.length - 1 ? (
                <div
                  aria-hidden
                  className="absolute left-[3.25rem] top-6 hidden h-px w-[calc(100%-2rem)] bg-slate-200 lg:block"
                />
              ) : null}

              <div className="relative">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <step.icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-flag-500 text-[11px] font-black text-white shadow-sm">
                  {index + 1}
                </span>
              </div>

              <h3 className="mt-5 text-base font-black text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Titre de section, partage par toutes les sections. */
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

/**
 * Modules.
 *
 * Fond gris tres leger pour detacher la section du blanc du hero. Les cartes
 * se soulsvent au survol : c'est le seul signal d'interactivite de la page,
 * elle doit donc etre franche.
 */
function Features() {
  return (
    <section
      id="fonctionnalites"
      className="scroll-mt-20 bg-slate-50 py-20"
    >
      <div className="container">
        <SectionHeading
          eyebrow="Ce que l'application fait"
          title="Tout le pressing, dans un seul endroit"
          subtitle="Les modules que vous utilisez vraiment au quotidien, sans tableur à côté."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="stagger-item card-hover rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              style={staggerStyle(index)}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <feature.icon className="h-5 w-5" aria-hidden />
              </span>

              <h3 className="mt-4 text-base font-black text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Questions frequentes.
 *
 * `<details>` plutot qu'un accordéon en JavaScript : le comportement
 * ouvrir/fermer, l'accessibilité clavier et le repli sans script sont
 * fournis par le navigateur. Sur une page qui doit rester legere, c'est le bon
 * arbitrage.
 */
function Faq() {
  return (
    <section className="py-20">
      <div className="container max-w-3xl">
        <SectionHeading
          eyebrow="Questions"
          title="Ce que vous voulez savoir"
        />

        <div className="mt-12 space-y-3">
          {FAQ.map((item, index) => (
            <details
              key={item.question}
              className="stagger-item group rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition open:border-brand-200"
              style={staggerStyle(index)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Appel final : la page se termine sur une seule action. */
function ClosingCta() {
  return (
    <section className="px-5 pb-20">
      <div className="container relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-900 px-6 py-16 text-center text-white sm:px-12">
        {/* Halo decoratif, tres discret. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5 blur-2xl"
        />

        <div className="relative mx-auto max-w-xl">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Ouvrez votre pressing aujourd&apos;hui
          </h2>
          <p className="mt-4 text-brand-100/90">
            Créez votre compte, saisissez votre catalogue, et prenez votre
            première commande. Le pressing Kappa vous attend.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="btn-press h-12 rounded-xl bg-white px-6 text-brand-800 hover:bg-brand-50"
            >
              <Link href="/register">
                Créer mon pressing
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="btn-press h-12 rounded-xl border-white/25 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Pied de page minimal : deux liens utiles, pas de plan de site inutile. */
function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8 text-xs" />
          <span className="font-bold text-slate-700">PressingPro</span>
        </div>

        <p className="text-xs">
          © {new Date().getFullYear()} PressingPro — Abidjan, Côte d&apos;Ivoire
        </p>

        <nav className="flex items-center gap-5 text-xs">
          <Link href="/login" className="transition hover:text-brand-700">
            Connexion
          </Link>
          <Link href="/register" className="transition hover:text-brand-700">
            Créer un compte
          </Link>
        </nav>
      </div>
    </footer>
  );
}
