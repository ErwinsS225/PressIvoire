"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fetchReferenceCatalogue } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { CatalogueEditor } from "@/components/onboarding/catalogue-editor";
import { useOnboardingStore, validateStep } from "@/lib/stores/onboarding";
import { CI_COMMUNES, WASH_TYPES, WASH_TYPE_LABELS, type WashType } from "@/lib/constants";

/**
 * Etape 2 — services proposes, frais de livraison, delais par type de lavage
 * et catalogue personnalise.
 */
export function OnboardingStep2() {
  const router = useRouter();
  const step2 = useOnboardingStore((state) => state.step2);
  const setStep2 = useOnboardingStore((state) => state.setStep2);
  const loadReferenceArticles = useOnboardingStore((state) => state.loadReferenceArticles);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Le catalogue type n'est lisible qu'une fois connecte : on le charge a
  // l'arrivee sur la page, pas au montage du store.
  useEffect(() => {
    let cancelled = false;
    fetchReferenceCatalogue().then((articles) => {
      if (cancelled) return;
      if (articles.length === 0) {
        toast.error("Catalogue type indisponible.");
      } else {
        loadReferenceArticles(articles);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadReferenceArticles]);

  const submit = () => {
    const found = validateStep(2, useOnboardingStore.getState());
    setErrors(found ?? {});
    if (found) {
      toast.error(found[Object.keys(found)[0]] ?? "Corrigez les champs signalés.");
      return;
    }
    router.push("/onboarding/pressing/step-3");
  };

  const setDelay = (key: WashType, value: number) =>
    setStep2({ defaultDelaysByWash: { ...step2.defaultDelaysByWash, [key]: value } });

  const setCommuneFee = (commune: string, value: number) => {
    const next = { ...step2.deliveryFeesByCommune };
    if (value > 0) next[commune] = value;
    else delete next[commune];
    setStep2({ deliveryFeesByCommune: next });
  };

  return (
    <StepWizard
      step={2}
      title="Services & tarifs"
      subtitle="Activez la collecte et la livraison, puis ajustez votre grille."
    >
      <div className="space-y-5">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <Toggle
            label="Collecte à domicile"
            hint="Nous passons chercher le linge chez le client."
            checked={step2.pickupEnabled}
            onChange={(checked) => setStep2({ pickupEnabled: checked })}
          />
          <Toggle
            label="Livraison à domicile"
            hint="Nous rapportons le linge propre chez le client."
            checked={step2.deliveryEnabled}
            onChange={(checked) => setStep2({ deliveryEnabled: checked })}
          />

          {step2.deliveryEnabled ? (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="delivery-fee"
                  className="flex-1 text-sm font-medium text-slate-700"
                >
                  Frais de livraison par défaut
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="delivery-fee"
                    type="number"
                    min={0}
                    value={step2.deliveryFee}
                    onChange={(event) =>
                      setStep2({ deliveryFee: Number.parseInt(event.target.value, 10) || 0 })
                    }
                    className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-right text-sm"
                  />
                  <span className="text-xs text-slate-500">FCFA</span>
                </div>
              </div>
              {errors.deliveryFee ? (
                <p className="text-xs font-medium text-destructive">{errors.deliveryFee}</p>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">
                  Tarif par commune (vide = tarif par défaut)
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CI_COMMUNES.map((commune) => (
                    <div key={commune} className="flex items-center gap-1">
                      <span className="flex-1 truncate text-xs text-slate-600">{commune}</span>
                      <input
                        type="number"
                        min={0}
                        value={step2.deliveryFeesByCommune[commune] ?? ""}
                        onChange={(event) =>
                          setCommuneFee(commune, Number.parseInt(event.target.value, 10) || 0)
                        }
                        aria-label={`Frais de livraison ${commune}`}
                        placeholder={String(step2.deliveryFee || 0)}
                        className="h-8 w-16 rounded border border-slate-200 px-1 text-right text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>


        {/* Delais par type de lavage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">Délais standard</h2>
          <p className="mt-1 text-xs text-slate-500">
            Délai indicatif annoncé au client, en heures.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.values(WASH_TYPES).map((key) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600">
                  {WASH_TYPE_LABELS[key]}
                </label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={336}
                    value={step2.defaultDelaysByWash[key]}
                    onChange={(event) =>
                      setDelay(key, Number.parseInt(event.target.value, 10) || 1)
                    }
                    aria-label={`Délai ${WASH_TYPE_LABELS[key]}`}
                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-right text-sm"
                  />
                  <span className="text-[10px] text-slate-400">h</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
            Chargement du catalogue type…
          </div>
        ) : (
          <CatalogueEditor errors={errors} />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => router.push("/onboarding/pressing/step-1")}
        >
          Retour
        </Button>
        <Button type="button" size="lg" onClick={submit} disabled={loading}>
          Continuer
        </Button>
      </div>
    </StepWizard>
  );
}

/** Interrupteur accessible (bouton + `role="switch"`). */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-brand-700" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

