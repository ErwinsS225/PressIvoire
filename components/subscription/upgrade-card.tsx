"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { PLANS } from "@/lib/plans";

/**
 * Carte d'appel à l'upgrade, affichée en bas de la barre latérale pour les
 * pressings en plan gratuit.
 *
 * Trois règles de copywriting, apprises à mes dépens sur ce projet :
 *
 * 1. ON DIT CE QUI MANQUE, PAS SEULEMENT CE QU'IL Y AURA. « Tournées,
 *    rapports, commandes illimitées » vaut mieux que « Gagnez plus ». Un
 *    gérant décide avec des faits, pas avec des adjectifs.
 *
 * 2. PAS DE COMPTE À REBOUNDIR. Le quota affiché ici est RÉELlement celui
 *    appliqué par la Server Action : afficher « 50/50 » alors qu'on accepte
 *    encore une commande ferait perdre confiance au premier refus.
 *
 * 3. ON NE PROMETT PAS CE QUI N'EXISTE PAS. Le paiement de l'abonnement
 *    n'est pas en ligne ; le bouton mène à la page qui explique comment
 *    upgrading, et le dit. Un bouton d'achat mort est pire qu'un lien
 *    honnête.
 */
export function UpgradeCard({
    usedOrders,
    limitOrders,
}: {
    /** Commandes déjà créées ce mois-ci. */
    usedOrders: number;
    /** Quota mensuel du plan courant ; `null` = illimité. */
    limitOrders: number | null;
}) {
    // Un quota déjà atteint se dit franchement : c'est le moment de la
    // décision, et un compteur en rouge à 100 % fait le travail tout seul.
    const exhausted = limitOrders !== null && usedOrders >= limitOrders;
    const near = limitOrders !== null && usedOrders >= limitOrders * 0.8;
    const progress =
        limitOrders === null || limitOrders === 0
            ? 0
            : Math.min(100, Math.round((usedOrders / limitOrders) * 100));

    return (
        <div className="mb-3 rounded-xl border border-[#4f46e5]/20 bg-[#4f46e5]/[0.06] p-3.5">
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#4f46e5]" />
                <p className="text-sm font-semibold">Passez au plan Pro</p>
            </div>

            <p className="mt-1.5 text-xs text-muted-foreground">
                Débloquez les tournées, les rapports et les commandes
                illimitées.
            </p>

            {/* Le quota, seulement s'il existe : l'afficher en illimité
                n'aurait aucun sens. */}
            {limitOrders !== null && (
                <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">
                            Commandes ce mois-ci
                        </span>
                        <span
                            className={
                                exhausted
                                    ? "font-semibold text-[#b91c1c]"
                                    : near
                                      ? "font-semibold text-[#b45309]"
                                      : "font-medium"
                            }
                        >
                            {usedOrders} / {limitOrders}
                        </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#4f46e5]/15">
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
                </div>
            )}

            <Link
                href="/abonnement"
                className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#4f46e5] text-sm font-medium text-white transition-colors hover:bg-[#4338ca]"
            >
                Upgrade Now
                <ArrowUpRight className="h-4 w-4" />
            </Link>

            <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {PLANS.pro.price.toLocaleString("fr-FR")} FCFA / mois
            </p>
        </div>
    );
}
