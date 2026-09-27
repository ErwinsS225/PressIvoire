"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { useOnboardingStore, validateStep } from "@/lib/stores/onboarding";
import { PLANS } from "@/lib/validation/onboarding";
import { formatFCFA } from "@/lib/utils";

/**
 * Etape 3 — choix de l'offre, puis finalisation.
 *
 * L'ecriture ne part pas au clic sur une carte mais via un bouton explicite :
 * l'utilisateur a le temps de relire son choix avant d'ecrire en base.
 */
export function OnboardingStep3() {
  const router = useRouter();
  const state = useOnboardingStore();
  const reset = useOnboardingStore((s) => s.reset);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const choosePlan = (plan: "free" | "pro") =>
    state.setStep3({ plan, trial: plan === "pro" });

  const finish = () => {
    const found = validateStep(3, state);
    if (found) {
      setError("Offre invalide.");
      return;
    }

    // On revalide l'INTEGRALITE du parcours : le store a pu etre altere
    // entre les etapes (retour arriere, session rechargee).
    startTransition(async () => {
      setError(null);
      try {
        await completeOnboarding(
          {},
          {
            pressing: state.step1,
            services: state.step2,
            subscription: state.step3,
          },
        );
        // La Server Action redirige vers /dashboard ; on ne reset qu'en cas
        // d'echec, pour ne pas perdre la saisie.
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "";
        if (message.includes("NEXT_REDIRECT")) {
          reset();
          return;
        }
        setError("Création impossible. Reessayez.");
        toast.error("Création impossible.");
      }
    });
  };

  const activeCount = state.step2.articles.filter((article) => article.isActive).length;

  return (
    <StepWizard
      step={3}
      title="Votre offre"
      subtitle="Choisissez le plan qui vous correspond. Sans engagement."
    >
      {/* Encart promotionnel — demande explicitement par le contrat. */}
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
        <span className="text-xl" aria-hidden>
          🎁
        </span>
        <div>
          <p className="text-sm font-bold text-orange-900">
            Offre de lancement : 30 jours d&apos;essai gratuit
          </p>
          <p className="mt-0.5 text-xs text-orange-800">
            Le plan Pro est offert pendant un mois, sans carte bancaire. Vous
            pourrez repasser au plan gratuit à tout moment.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const selected = state.step3.plan === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => choosePlan(plan.id)}
              aria-pressed={selected}
              className={`btn-press rounded-2xl border-2 p-5 text-left transition ${
                selected
                  ? "border-orange-500 bg-orange-50/50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                {selected ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                    ✓
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {plan.price === 0 ? "Gratuit" : formatFCFA(plan.price)}
                {plan.price > 0 ? (
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    {plan.period}
                  </span>
                ) : null}
              </p>

              <ul className="mt-3 space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 text-brand-700" aria-hidden>
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.id === "pro" && state.step3.trial ? (
                <p className="mt-3 rounded-lg bg-orange-100 px-2 py-1 text-center text-[11px] font-bold text-orange-800">
                  Essai gratuit de 30 jours
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      {/* Rappel de ce qui va etre cree : la transaction est irreversible. */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Vous allez créer :</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>Votre fiche pressing « {state.step1.name || "sans nom"} »</li>
          <li>
            {activeCount} article{activeCount > 1 ? "s" : ""} au catalogue
          </li>
          <li>
            Un abonnement{" "}
            {state.step3.plan === "pro" ? "Pro en essai gratuit 30 jours" : "Gratuit"}
          </li>
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => router.push("/onboarding/pressing/step-2")}
        >
          Retour
        </Button>
        <Button
          type="button"
          size="lg"
          variant="accent"
          onClick={finish}
          disabled={isPending || !state.step1.name}
        >
          {isPending
            ? "Création…"
            : state.step3.plan === "pro"
              ? "Démarrer mon essai gratuit"
              : "Continuer avec le plan gratuit"}
        </Button>
      </div>
    </StepWizard>
  );
}

