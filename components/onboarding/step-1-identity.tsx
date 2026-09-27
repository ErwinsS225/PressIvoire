"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadLogo } from "@/app/actions/onboarding";
import { InputField, SelectField } from "@/components/auth/input-field";
import { Button } from "@/components/ui/button";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { useOnboardingStore, validateStep } from "@/lib/stores/onboarding";
import { CI_COMMUNES } from "@/lib/constants";
import { OPENING_DAYS } from "@/lib/validation/onboarding";

/**
 * Etape 1 — identite du pressing : nom, commune, adresse, telephone,
 * horaires d'ouverture et logo.
 */
export function OnboardingStep1() {
  const router = useRouter();
  const step1 = useOnboardingStore((state) => state.step1);
  const setStep1 = useOnboardingStore((state) => state.setStep1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const submit = () => {
    const found = validateStep(1, useOnboardingStore.getState());
    setErrors(found ?? {});
    if (found) {
      toast.error("Corrigez les champs signalés.");
      return;
    }
    router.push("/onboarding/pressing/step-2");
  };

  const onPickLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("logo", file);
      const result = await uploadLogo(formData);

      if (result.error) {
        toast.error(result.error);
        if (fileInput.current) fileInput.current.value = "";
        return;
      }
      setStep1({ logoUrl: result.url ?? null });
      toast.success("Logo enregistré.");
    });
  };

  /** Met a jour un jour : la deuxieme borne n'est touchee que si elle existe. */
  const setDay = (key: string, bound: "open" | "close", value: string) => {
    const current = step1.openingHours[key] ?? null;
    const open = bound === "open" ? value : (current?.slice(0, 5) ?? "08:00");
    const close = bound === "close" ? value : (current?.slice(6, 11) ?? "18:00");

    setStep1({
      openingHours: {
        ...step1.openingHours,
        [key]: value ? `${open}:00-${close}:00` : null,
      },
    });
  };

  return (
    <StepWizard
      step={1}
      title="Identité du pressing"
      subtitle="Ces informations apparaissent sur votre fiche publique."
    >
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <InputField
          label="Nom du pressing"
          name="name"
          placeholder="Pressing Élégance Cocody"
          value={step1.name}
          onChange={(event) => setStep1({ name: event.target.value })}
          error={errors.name}
          required
        />

        <SelectField
          label="Commune"
          name="commune"
          value={step1.commune}
          onChange={(event) => setStep1({ commune: event.target.value })}
          error={errors.commune}
          options={CI_COMMUNES.map((commune) => ({ value: commune, label: commune }))}
        />

        <InputField
          label="Adresse"
          name="address"
          placeholder="Bd Latrille, Cocody Abidjan"
          value={step1.address}
          onChange={(event) => setStep1({ address: event.target.value })}
          error={errors.address}
          required
        />

        <InputField
          label="Téléphone professionnel"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="+225 07 08 09 10 11"
          value={step1.phone}
          onChange={(event) => setStep1({ phone: event.target.value })}
          error={errors.phone}
          hint="Ce numéro sera visible par vos clients."
          required
        />

        {/* Logo — 2 Mo, JPEG/PNG/WebP (contraintes du bucket pressing-assets) */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium leading-none">Logo</span>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {step1.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={step1.logoUrl}
                  alt="Logo du pressing"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl" aria-hidden>
                  🏪
                </span>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInput}
                id="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPickLogo}
                className="sr-only"
              />
              <label
                htmlFor="logo"
                className="btn-press inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isPending ? "Envoi…" : step1.logoUrl ? "Remplacer" : "Choisir une image"}
              </label>
              <p className="mt-1 text-xs text-slate-400">
                JPEG, PNG ou WebP &middot; 2 Mo maximum
              </p>
            </div>
          </div>
        </div>

        {/* Horaires : un jour vide = ferme. La validation du format "HH:MM-HH:MM"
            est faite par le schema a l'etape suivante, pas ici. */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium leading-none">
            Horaires d&apos;ouverture
          </legend>
          <p className="text-xs text-slate-400">Cliquez sur « Fermé » pour un jour de repos.</p>

          {OPENING_DAYS.map((day) => {
            const value = step1.openingHours[day.key] ?? "";
            return (
              <div key={day.key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium text-slate-600">
                  {day.label}
                </span>
                <input
                  type="time"
                  value={value ? value.slice(0, 5) : ""}
                  onChange={(event) => setDay(day.key, "open", event.target.value)}
                  aria-label={`Ouverture ${day.label}`}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
                />
                <span className="text-xs text-slate-300">à</span>
                <input
                  type="time"
                  value={value.length > 6 ? value.slice(6, 11) : ""}
                  onChange={(event) => setDay(day.key, "close", event.target.value)}
                  aria-label={`Fermeture ${day.label}`}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
                />
                {value ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStep1({
                        openingHours: { ...step1.openingHours, [day.key]: null },
                      })
                    }
                    className="btn-press text-xs text-slate-400 hover:text-red-600"
                  >
                    Fermé
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400">FERMÉ</span>
                )}
              </div>
            );
          })}
        </fieldset>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-slate-400">Étape 1 sur 3</p>
        <Button type="button" size="lg" onClick={submit} disabled={isPending}>
          Continuer
        </Button>
      </div>
    </StepWizard>
  );
}

