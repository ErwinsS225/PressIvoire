"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrder } from "@/app/actions/orders";
import { Avatar } from "@/components/ui/avatar-initials";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { EmptyState } from "@/components/ui/empty-state";
import { WASH_TYPE_LABELS, type WashType } from "@/lib/constants";
import { cn, formatAmount } from "@/lib/utils";

type Article = {
  id: string;
  name: string;
  category: string;
  wash_type: string;
  price: number;
};

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
};

/** Emoji d'illustration par categorie (la maquette utilise des emojis). */
const CATEGORY_ICONS: Record<string, string> = {
  habit: "👕",
  linge_maison: "🛏️",
  cuir: "👜",
  delicat: "🧴",
};

const WASH_ORDER: WashType[] = ["sec", "eau", "repassage_seul", "detachage"];
const STEPS = ["Client", "Articles", "Confirmation"] as const;

/**
 * Creation d'une commande en 3 etapes : choix du client, choix des articles,
 * puis confirmation avec animation de reussite.
 *
 * Tout l'etat vit dans le client ; la persistance passe par la Server
 * Action `createOrder`, puis on redirige vers le detail de la commande creee.
 */
export function NewOrderFlow({
  clients,
  articles,
  deliveryFee,
}: {
  clients: Client[];
  articles: Article[];
  deliveryFee: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);
  const [washType, setWashType] = useState<WashType>("sec");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [deliveryType, setDeliveryType] = useState<"in_store" | "home_delivery">("in_store");
  const [created, setCreated] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => articles.filter((article) => article.wash_type === washType),
    [articles, washType],
  );

  const cart = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([articleId, quantity]) => {
          const article = articles.find((candidate) => candidate.id === articleId);
          return article ? { ...article, quantity } : null;
        })
        .filter((item): item is Article & { quantity: number } => item !== null),
    [quantities, articles],
  );

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (deliveryType === "home_delivery" ? deliveryFee : 0);
  const selectedClient = clients.find((candidate) => candidate.id === clientId) ?? null;

  const change = (articleId: string, delta: number) => {
    setQuantities((previous) => {
      const next = Math.max(0, Math.min(9999, (previous[articleId] ?? 0) + delta));
      const copy = { ...previous, [articleId]: next };
      if (next === 0) delete copy[articleId];
      return copy;
    });
  };

  const submit = () => {
    if (!selectedClient || cart.length === 0) return;
    startTransition(async () => {
      try {
        const result = await createOrder({
          clientId: selectedClient.id,
          deliveryType,
          items: cart.map((item) => ({
            articleId: item.id,
            articleName: `${item.name} — ${
              WASH_TYPE_LABELS[item.wash_type as WashType] ?? item.wash_type
            }`,
            quantity: item.quantity,
            unitPrice: item.price,
            washType: item.wash_type,
          })),
        });
        setCreated(result.orderId);
        toast.success("Commande enregistrée");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Création impossible.");
      }
    });
  };

  if (created) return <SuccessPanel orderId={created} />;

  return (
    <>
      <div className="mb-4">
        <ProgressSteps steps={STEPS} current={step} />
      </div>

      {/* Etape 1 — client */}
      {step === 0 ? (
        <div className="px-5">
          {clients.length === 0 ? (
            <EmptyState
              icon="👥"
              title="Aucun client enregistré"
              hint="Ajoutez un client avant de créer une commande."
            />
          ) : (
            <div className="space-y-2">
              {clients.map((candidate, index) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setClientId(candidate.id)}
                  className={cn(
                    "card-hover flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                    candidate.id === clientId
                      ? "border-2 border-orange-500 bg-orange-50/40"
                      : "border-slate-100 bg-white",
                    `animate-slide-up stagger-${Math.min(index + 1, 6)}`,
                  )}
                >
                  <Avatar name={candidate.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {candidate.full_name}
                    </p>
                    {candidate.phone ? (
                      <p className="truncate text-xs text-slate-500">{candidate.phone}</p>
                    ) : null}
                  </div>
                  {candidate.id === clientId ? (
                    <span className="text-sm text-orange-500" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Etape 2 — articles */}
      {step === 1 ? (
        <div className="space-y-4 px-5">
          {selectedClient ? (
            <div className="flex animate-scale-in items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
              <Avatar name={selectedClient.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedClient.full_name}
                </p>
                {selectedClient.phone ? (
                  <p className="truncate text-xs text-slate-500">{selectedClient.phone}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="text-xs font-medium text-slate-500"
              >
                Changer
              </button>
            </div>
          ) : null}

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {WASH_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setWashType(type)}
                aria-pressed={type === washType}
                className={cn(
                  "btn-press shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition",
                  type === washType
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {WASH_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <EmptyState icon="🧺" title="Aucun article pour ce service" />
            ) : (
              filtered.map((article, index) => {
                const quantity = quantities[article.id] ?? 0;
                return (
                  <div
                    key={article.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl bg-white p-3",
                      quantity > 0 ? "border-2 border-orange-500" : "border border-slate-100",
                      `animate-slide-up stagger-${Math.min(index + 1, 6)}`,
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-xl",
                        quantity > 0 ? "bg-orange-50" : "bg-slate-50",
                      )}
                      aria-hidden
                    >
                      {CATEGORY_ICONS[article.category] ?? "👕"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {article.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatAmount(article.price)} FCFA / unité
                      </p>
                    </div>
                    <QuantityControl
                      quantity={quantity}
                      label={article.name}
                      onChange={(delta) => change(article.id, delta)}
                    />
                  </div>
                );
              })
            )}
          </div>

          <div className="h-28" />
        </div>
      ) : null}


      {/* Etape 3 — recapitulatif */}
      {step === 2 ? (
        <div className="space-y-4 px-5">
          <ReviewRow label="Client" value={selectedClient?.full_name ?? "—"} />
          <ReviewRow
            label="Articles"
            value={`${totalCount} article${totalCount > 1 ? "s" : ""}`}
          />
          <ReviewRow label="Sous-total" value={`${formatAmount(subtotal)} FCFA`} />

          <div className="rounded-xl border border-slate-100 bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Remise</p>
            <div className="mt-2 flex gap-2">
              {(["in_store", "home_delivery"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDeliveryType(type)}
                  aria-pressed={deliveryType === type}
                  className={cn(
                    "btn-press flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold transition",
                    deliveryType === type
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {type === "in_store"
                    ? "Retrait en boutique"
                    : `Livraison (${formatAmount(deliveryFee)} F)`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white">
            <p className="text-xs font-medium text-slate-400">Total</p>
            <p className="text-2xl font-black">
              {formatAmount(total)}
              <span className="text-sm font-bold text-slate-400"> FCFA</span>
            </p>
          </div>

          <button
            type="button"
            disabled={isPending || cart.length === 0}
            onClick={submit}
            className="btn-press w-full rounded-xl bg-orange-500 py-4 font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            {isPending ? "Enregistrement…" : "Valider la commande"}
          </button>
        </div>
      ) : null}

      {/* Barre de panier flottante, au-dessus de la navigation */}
      {step === 1 && cart.length > 0 ? (
        <div className="absolute inset-x-4 bottom-20 z-10 animate-slide-up rounded-2xl bg-slate-900 p-4 text-white shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">
                {totalCount} article{totalCount > 1 ? "s" : ""} &bull; Total
              </p>
              <p className="text-xl font-black">
                {formatAmount(total)}
                <span className="text-xs font-bold text-slate-400"> FCFA</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-press rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600"
            >
              Continuer &rarr;
            </button>
          </div>
        </div>
      ) : null}

      {/* Navigation entre etapes */}
      <div className="px-5 pt-4">
        <div className="flex gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn-press flex-1 rounded-xl border border-slate-200 bg-white py-3 font-bold text-slate-700"
            >
              Retour
            </button>
          ) : null}
          {step < 2 ? (
            <button
              type="button"
              disabled={step === 0 ? !clientId : cart.length === 0}
              onClick={() => setStep(step + 1)}
              className="btn-press flex-1 rounded-xl bg-slate-900 py-3 font-bold text-white transition disabled:opacity-40"
            >
              Continuer
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}


/** Compteur quantite : "+" seul a zero, sinon le trio -/valeur/+. */
function QuantityControl({
  quantity,
  label,
  onChange,
}: {
  quantity: number;
  label: string;
  onChange: (delta: number) => void;
}) {
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label={`Ajouter ${label}`}
        className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700"
      >
        +
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(-1)}
        aria-label={`Retirer un ${label}`}
        className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700"
      >
        &minus;
      </button>
      <span className="w-6 text-center font-bold text-slate-900">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label={`Ajouter un ${label}`}
        className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 font-bold text-white"
      >
        +
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

/** Ecran de confirmation : coche anime puis redirection vers la commande. */
function SuccessPanel({ orderId }: { orderId: string }) {
  const router = useRouter();

  return (
    <div className="flex h-full items-center justify-center px-5">
      <div className="w-full text-center">
        <div className="relative mx-auto mb-6 h-28 w-28">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-100 opacity-30" />
          <div
            className="animate-scale-in absolute inset-0 flex items-center justify-center rounded-full bg-green-500"
            style={{ animationDelay: "0.1s" }}
          >
            <svg
              className="h-14 w-14 text-white"
              viewBox="0 0 52 52"
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path
                d="M14 27l7.5 7.5L38 20"
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: 100,
                  animation: "checkmark 0.6s ease-out 0.3s forwards",
                }}
              />
            </svg>
          </div>
        </div>

        <h1 className="animate-slide-up stagger-3 text-2xl font-black text-slate-900">
          Commande enregistrée !
        </h1>
        <p className="animate-slide-up stagger-4 mt-2 text-sm text-slate-500">
          Le client sera notifié par WhatsApp
        </p>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => router.push(`/orders/${orderId}`)}
            className="btn-press w-full rounded-xl bg-slate-900 py-4 font-bold text-white transition hover:bg-slate-800"
          >
            Voir la commande
          </button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="btn-press w-full rounded-xl border border-slate-200 bg-white py-4 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Créer une autre commande
          </button>
        </div>
      </div>
    </div>
  );
}

