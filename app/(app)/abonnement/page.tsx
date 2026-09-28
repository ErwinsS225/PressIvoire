import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Minus, Sparkles, TriangleAlert } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { getContext } from "@/lib/supabase/queries";
import {
    getEffectivePlan,
    getMonthlyOrderCountForPlan,
} from "@/lib/subscriptions";
import { PLANS } from "@/lib/plans";
import { formatFCFA } from "@/lib/utils";

export const metadata = { title: "Abonnement" };

/** Les deux plans réellement vendables aujourd'hui. */
const OFFER = { free: PLANS.free, pro: PLANS.pro } as const;

/**
 * Page d'abonnement.
 *
 * Dédiée plutôt qu'une section des paramètres : décider de payer est un acte
 * à part entière, pas un réglage parmi d'autres. Elle mérite son URL — un
 * gérant peut l'envoyer à son comptable ou la mettre en favori.
 *
 * Contenu : le plan EN COURS et sa consommation réelle, la comparaison
 * ligne à ligne, et un appel à l'action HONNÊTE : le paiement n'est pas
 * branché, et on ne fait pas semblant le contraire.
 */
export default async function SubscriptionPage() {
    const { pressing } = await getContext();

    if (!pressing) {
        redirect("/onboarding/pressing");
    }

    const context = await getEffectivePlan();
    const plan = context?.plan ?? PLANS.free;
    const isActive = context?.isActive ?? false;
    const storedPlanId = context?.storedPlanId ?? "free";
    const isFree = plan.id === "free";

    const used = await getMonthlyOrderCountForPlan(pressing.id);
    const limit = plan.limits.ordersPerMonth;

    // Quota atteint : le moment de la décision. L'écran doit le dire AVANT que
    // le gérant ne se fasse refuser une commande.
    const exhausted = limit !== null && used >= limit;
    const near = limit !== null && used >= limit * 0.8;
    const progress =
        limit === null || limit === 0
            ? 0
            : Math.min(100, Math.round((used / limit) * 100));

    /* Ce que le plan Pro débloque, et pourquoi ça compte. */
    const UNLOCKS = [
        {
            label: "Tournées de livraison",
            detail: "Suivre ce qui part et ce qui revient, par livreur.",
        },
        {
            label: "Rapports d'activité",
            detail: "CA sur 7 jours, panier moyen, meilleurs clients.",
        },
        {
            label: "Commandes illimitées",
            detail: "Plus de plafond de 50 par mois.",
        },
        {
            label: "5 employés",
            detail: "Responsables, caissiers et livreurs.",
        },
        {
            label: "Encaissements partiels",
            detail: "Enregistrer un acompte plutôt que la totalité.",
        },
        {
            label: "SMS et WhatsApp",
            detail: "Notifier le client à chaque étape de sa commande.",
        },
    ] as const;

    return (
        <div className="flex flex-col gap-8">
            <Header
                title="Abonnement"
                subtitle={`${pressing.name} — ${pressing.commune}`}
            />

            {/* --- Plan en cours --- */}
            <Card className="elev-1">
                <CardHeader>
                    <CardTitle>Votre plan actuel</CardTitle>
                    <CardDescription>
                        {isFree
                            ? "Plan gratuit — plusieurs fonctions sont verrouillées."
                            : "Plan payant actif."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-900 p-5 text-white">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Plan</p>
                            <p className="mt-1 text-2xl font-bold">{plan.name}</p>
                        </div>
                        <div className="text-right">
                            <Badge variant={isActive ? "success" : "danger"}>
                                {isActive ? "Actif" : "Expiré"}
                            </Badge>
                            {plan.price > 0 && (
                                <p className="mt-2 text-sm text-slate-300">
                                    {formatFCFA(plan.price)} / mois
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Consommation RÉELLE, lue dans la même source que le
                        contrôle appliqué par createOrder(). */}
                    {limit !== null && (
                        <div className="grid gap-2">
                            <div className="flex items-baseline justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Commandes ce mois-ci
                                </span>
                                <span
                                    className={
                                        exhausted
                                            ? "font-semibold text-[#b91c1c]"
                                            : near
                                              ? "font-semibold text-[#b45309]"
                                              : "font-medium tabular-nums"
                                    }
                                >
                                    {used} / {limit}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={
                                        exhausted
                                            ? "h-full rounded-full bg-[#dc2626]"
                                            : near
                                              ? "h-full rounded-full bg-[#d97706]"
                                              : "h-full rounded-full bg-[#4f46e5]"
                                    }
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            {exhausted ? (
                                <p className="text-sm text-[#b91c1c]">
                                    Quota atteint : les nouvelles commandes
                                    sont bloquées jusqu&apos;au 1er du mois
                                    prochain.
                                </p>
                            ) : near ? (
                                <p className="text-sm text-[#b45309]">
                                    Vous approchez de la limite. Le plan Pro
                                    supprime ce plafond.
                                </p>
                            ) : null}
                        </div>
                    )}

                    {!isActive && (
                        <p className="rounded-lg bg-[#fef3c7] p-3 text-sm text-[#b45309]">
                            Votre abonnement a expiré : les capacités du plan{" "}
                            {PLANS[storedPlanId].name} sont suspendues.
                            Renouvelez pour les retrouver.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* --- Comparatif gratuit / Pro --- */}
            <section className="grid gap-6 md:grid-cols-2">
                {([OFFER.free, OFFER.pro] as const).map((p) => {
                    const isCurrent = p.id === plan.id;
                    const recommended = p.id === "pro" && isFree;

                    return (
                        <Card
                            key={p.id}
                            className={
                                recommended ? "elev-1 border-[#4f46e5]" : "elev-1"
                            }
                        >
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        {p.id === "pro" && (
                                            <Sparkles className="h-4 w-4 text-[#4f46e5]" />
                                        )}
                                        {p.name}
                                    </CardTitle>
                                    {isCurrent ? (
                                        <Badge variant="success">Actuel</Badge>
                                    ) : recommended ? (
                                        <Badge variant="info">Recommandé</Badge>
                                    ) : null}
                                </div>
                                <CardDescription>
                                    {p.price === 0
                                        ? "Gratuit, pour toujours"
                                        : `${formatFCFA(p.price)} par mois`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <ul className="grid gap-2">
                                    {p.features.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#15803d]" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {!isCurrent && <UpgradeCta planName={p.name} />}
                            </CardContent>
                        </Card>
                    );
                })}
            </section>


            {/* --- Ce que Pro débloque, précisément --- */}
            {isFree && (
                <Card className="elev-1">
                    <CardHeader>
                        <CardTitle>Ce que le plan Pro débloque</CardTitle>
                        <CardDescription>
                            Ces fonctions sont désactivées sur votre compte
                            aujourd&apos;hui.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="grid gap-3 md:grid-cols-2">
                            {UNLOCKS.map((row) => (
                                <li key={row.label} className="flex gap-2">
                                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>
                                        <span className="font-medium">
                                            {row.label}
                                        </span>
                                        <span className="block text-sm text-muted-foreground">
                                            {row.detail}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* --- Honnêteté sur le paiement --- */}
            <Card className="elev-1 border-[#b45309]/30 bg-[#fef3c7]/30">
                <CardContent className="flex gap-3 pt-6">
                    <TriangleAlert className="h-5 w-5 shrink-0 text-[#b45309]" />
                    <div className="grid gap-1">
                        <p className="font-medium text-[#b45309]">
                            Le paiement en ligne n&apos;est pas encore actif
                        </p>
                        <p className="text-sm text-[#b45309]/90">
                            L&apos;activation du plan Pro se fait pour l&apos;instant
                            auprès du support. Dès que la passerelle de paiement
                            (Wave, Orange Money, MTN, Moov) sera branchée, ce bouton
                            paiera directement depuis l&apos;écran.
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mt-2 w-fit"
                        >
                            <Link href="/settings">Retour aux paramètres</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Appel à l'action d'un plan payant.
 *
 * Ce n'est PAS un bouton d'achat : le paiement n'existe pas encore, et un
 * bouton qui ne fait rien est pire que pas de bouton du tout. On renvoie
 * vers le support — en le disant.
 */
function UpgradeCta({ planName }: { planName: string }) {
    return (
        <div className="grid gap-2 border-t pt-4">
            <Button asChild className="w-full">
                <Link href="/settings">Contacter le support</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                Activation du plan {planName} par le support — le paiement en
                ligne arrive bientôt.
            </p>
        </div>
    );
}

