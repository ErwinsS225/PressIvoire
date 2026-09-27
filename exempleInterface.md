Voici une maquette interactive complète et animée de votre application. C'est un fichier HTML autonome que vous pouvez ouvrir directement dans votre navigateur pour voir le design et les animations en action.

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PressingPro CI — Maquette UI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
      rel="stylesheet"
    />
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: { sans: ["Inter", "sans-serif"] },
            colors: {
              primary: "#0F172A",
              accent: "#F97316",
              success: "#25D366",
              surface: "#F8FAFC",
            },
            keyframes: {
              "fade-in": {
                "0%": { opacity: "0" },
                "100%": { opacity: "1" },
              },
              "slide-up": {
                "0%": { opacity: "0", transform: "translateY(20px)" },
                "100%": { opacity: "1", transform: "translateY(0)" },
              },
              "slide-in-right": {
                "0%": { opacity: "0", transform: "translateX(30px)" },
                "100%": { opacity: "1", transform: "translateX(0)" },
              },
              "scale-in": {
                "0%": { opacity: "0", transform: "scale(0.9)" },
                "100%": { opacity: "1", transform: "scale(1)" },
              },
              "pulse-soft": {
                "0%, 100%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.05)" },
              },
              checkmark: {
                "0%": { strokeDashoffset: "100" },
                "100%": { strokeDashoffset: "0" },
              },
              "bounce-subtle": {
                "0%, 100%": { transform: "translateY(0)" },
                "50%": { transform: "translateY(-5px)" },
              },
              shimmer: {
                "0%": { backgroundPosition: "-1000px 0" },
                "100%": { backgroundPosition: "1000px 0" },
              },
              "ring-pulse": {
                "0%": { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0.7)" },
                "70%": { boxShadow: "0 0 0 15px rgba(249, 115, 22, 0)" },
                "100%": { boxShadow: "0 0 0 0 rgba(249, 115, 22, 0)" },
              },
            },
            animation: {
              "fade-in": "fade-in 0.4s ease-out",
              "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              "slide-in-right":
                "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              "pulse-soft": "pulse-soft 2s ease-in-out infinite",
              "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
              shimmer: "shimmer 2s linear infinite",
              "ring-pulse": "ring-pulse 2s infinite",
            },
          },
        },
      };
    </script>
    <style>
      * {
        -webkit-tap-highlight-color: transparent;
      }
      body {
        font-family: "Inter", sans-serif;
      }
      .glass {
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.8);
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .stagger-1 {
        animation-delay: 0.05s;
        opacity: 0;
        animation-fill-mode: forwards;
      }
      .stagger-2 {
        animation-delay: 0.1s;
        opacity: 0;
        animation-fill-mode: forwards;
      }
      .stagger-3 {
        animation-delay: 0.15s;
        opacity: 0;
        animation-fill-mode: forwards;
      }
      .stagger-4 {
        animation-delay: 0.2s;
        opacity: 0;
        animation-fill-mode: forwards;
      }
      .stagger-5 {
        animation-delay: 0.25s;
        opacity: 0;
        animation-fill-mode: forwards;
      }
      .stagger-6 {
        animation-delay: 0.3s;
        opacity: 0;
        animation-fill-mode: forwards;
      }
      .card-hover {
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.15);
      }
      .btn-press {
        transition: transform 0.1s ease;
      }
      .btn-press:active {
        transform: scale(0.96);
      }
      .nav-item {
        transition: all 0.2s ease;
      }
      .nav-item:hover {
        background: rgba(249, 115, 22, 0.08);
        color: #f97316;
      }
      .nav-item.active {
        background: rgba(249, 115, 22, 0.12);
        color: #f97316;
      }
      .status-badge {
        transition: all 0.3s ease;
      }
      .screen {
        display: none;
      }
      .screen.active {
        display: block;
        animation: fade-in 0.4s ease-out;
      }
      .progress-step {
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .phone-mockup {
        box-shadow:
          0 50px 100px -20px rgba(15, 23, 42, 0.25),
          0 30px 60px -30px rgba(15, 23, 42, 0.3);
      }
      .toast-enter {
        animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .fab-pulse {
        animation: ring-pulse 2s infinite;
      }
    </style>
  </head>
  <body class="bg-slate-100 min-h-screen p-4 md:p-8">
    <!-- Contrôles de navigation (hors app) -->
    <div class="max-w-7xl mx-auto mb-6">
      <div
        class="bg-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-2"
      >
        <span
          class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2"
          >Écrans :</span
        >
        <button
          onclick="showScreen('dashboard')"
          class="screen-btn px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white btn-press"
          data-screen="dashboard"
        >
          📊 Dashboard
        </button>
        <button
          onclick="showScreen('new-order')"
          class="screen-btn px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 btn-press"
          data-screen="new-order"
        >
          ➕ Nouvelle commande
        </button>
        <button
          onclick="showScreen('order-detail')"
          class="screen-btn px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 btn-press"
          data-screen="order-detail"
        >
          📋 Détail commande
        </button>
        <button
          onclick="showScreen('orders-list')"
          class="screen-btn px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 btn-press"
          data-screen="orders-list"
        >
          📚 Liste commandes
        </button>
        <button
          onclick="showScreen('success')"
          class="screen-btn px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 btn-press"
          data-screen="success"
        >
          ✅ Confirmation
        </button>
      </div>
    </div>

    <!-- Mockup téléphone -->
    <div class="max-w-md mx-auto">
      <div
        class="phone-mockup bg-white rounded-[40px] overflow-hidden relative"
        style="height: 780px;"
      >
        <!-- Status bar -->
        <div
          class="bg-white px-6 pt-3 pb-2 flex justify-between items-center text-xs font-semibold text-slate-900"
        >
          <span>9:41</span>
          <div class="flex gap-1 items-center">
            <span>📶</span><span>📡</span><span>🔋</span>
          </div>
        </div>

        <!-- ÉCRAN : DASHBOARD -->
        <div
          id="screen-dashboard"
          class="screen active h-full overflow-y-auto scrollbar-hide pb-24"
        >
          <!-- Header -->
          <div class="px-6 pt-4 pb-4 animate-slide-up stagger-1">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs text-slate-400 font-medium">Bonjour 👋</p>
                <h1 class="text-xl font-bold text-slate-900 mt-0.5">
                  Pressing Élégance
                </h1>
                <p class="text-xs text-slate-500 mt-1">Cocody, Abidjan</p>
              </div>
              <button
                class="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center btn-press hover:bg-slate-200 transition"
              >
                <span class="text-lg">🔔</span>
              </button>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="px-6 grid grid-cols-2 gap-3">
            <!-- CA du jour -->
            <div
              class="col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white card-hover animate-slide-up stagger-2 relative overflow-hidden"
            >
              <div
                class="absolute -right-8 -top-8 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl"
              ></div>
              <div class="relative">
                <div class="flex items-center justify-between">
                  <p class="text-xs text-slate-300 font-medium">CA du jour</p>
                  <span
                    class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold"
                    >+18%</span
                  >
                </div>
                <p class="text-3xl font-black mt-2 tracking-tight">
                  87 500
                  <span class="text-lg font-bold text-slate-400">FCFA</span>
                </p>
                <div
                  class="flex items-center gap-2 mt-3 text-xs text-slate-400"
                >
                  <span
                    class="w-2 h-2 rounded-full bg-green-400 animate-pulse"
                  ></span>
                  <span>12 commandes aujourd'hui</span>
                </div>
              </div>
            </div>

            <!-- En traitement -->
            <div
              class="bg-white rounded-2xl p-4 border border-slate-100 card-hover animate-slide-up stagger-3"
            >
              <div
                class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3"
              >
                <span class="text-lg">🧺</span>
              </div>
              <p class="text-2xl font-black text-slate-900">5</p>
              <p class="text-xs text-slate-500 font-medium mt-0.5">
                En traitement
              </p>
            </div>

            <!-- Prêtes -->
            <div
              class="bg-white rounded-2xl p-4 border border-slate-100 card-hover animate-slide-up stagger-4"
            >
              <div
                class="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3"
              >
                <span class="text-lg">✅</span>
              </div>
              <p class="text-2xl font-black text-slate-900">3</p>
              <p class="text-xs text-slate-500 font-medium mt-0.5">
                Prêtes à livrer
              </p>
            </div>
          </div>

          <!-- Section : À livrer aujourd'hui -->
          <div class="px-6 mt-6 animate-slide-up stagger-5">
            <div class="flex justify-between items-center mb-3">
              <h2 class="text-sm font-bold text-slate-900">
                À livrer aujourd'hui
              </h2>
              <button class="text-xs text-orange-500 font-semibold">
                Tout voir →
              </button>
            </div>

            <div class="space-y-2">
              <!-- Commande 1 -->
              <div
                class="bg-white rounded-xl p-3 border border-slate-100 flex items-center gap-3 card-hover cursor-pointer"
              >
                <div
                  class="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm"
                >
                  AK
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900 truncate">
                    Awa Koné
                  </p>
                  <p class="text-xs text-slate-500">
                    CMD-2026-0042 • 3 articles
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-slate-900">8 500</p>
                  <p class="text-[10px] text-slate-400">FCFA</p>
                </div>
              </div>

              <!-- Commande 2 -->
              <div
                class="bg-white rounded-xl p-3 border border-slate-100 flex items-center gap-3 card-hover cursor-pointer"
              >
                <div
                  class="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm"
                >
                  YB
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900 truncate">
                    Yao Brou
                  </p>
                  <p class="text-xs text-slate-500">
                    CMD-2026-0041 • 5 articles
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-slate-900">12 000</p>
                  <p class="text-[10px] text-slate-400">FCFA</p>
                </div>
              </div>

              <!-- Commande 3 -->
              <div
                class="bg-white rounded-xl p-3 border border-slate-100 flex items-center gap-3 card-hover cursor-pointer"
              >
                <div
                  class="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm"
                >
                  FD
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-slate-900 truncate">
                    Fatou Diallo
                  </p>
                  <p class="text-xs text-slate-500">
                    CMD-2026-0040 • 2 articles
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-slate-900">5 000</p>
                  <p class="text-[10px] text-slate-400">FCFA</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ÉCRAN : NOUVELLE COMMANDE -->
        <div
          id="screen-new-order"
          class="screen h-full overflow-y-auto scrollbar-hide pb-24"
        >
          <!-- Header -->
          <div class="px-6 pt-4 pb-4 flex items-center gap-3 animate-slide-up">
            <button
              onclick="showScreen('dashboard')"
              class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center btn-press"
            >
              <span>←</span>
            </button>
            <div>
              <h1 class="text-lg font-bold text-slate-900">
                Nouvelle commande
              </h1>
              <p class="text-xs text-slate-500">Étape 2 sur 3</p>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="px-6 mb-4">
            <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full w-2/3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-700 ease-out"
              ></div>
            </div>
            <div
              class="flex justify-between mt-2 text-[10px] font-semibold text-slate-400"
            >
              <span class="text-orange-500">1. Client</span>
              <span class="text-orange-500">2. Articles</span>
              <span>3. Confirmation</span>
            </div>
          </div>

          <!-- Client sélectionné -->
          <div class="px-6 mb-4">
            <div
              class="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3 animate-scale-in"
            >
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm"
              >
                AK
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-slate-900">Awa Koné</p>
                <p class="text-xs text-slate-500">+225 07 08 09 10 11</p>
              </div>
              <button class="text-xs text-slate-400 font-medium">
                Changer
              </button>
            </div>
          </div>

          <!-- Onglets services -->
          <div class="px-6 mb-4">
            <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button
                class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white whitespace-nowrap btn-press"
              >
                Lavage à sec
              </button>
              <button
                class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap btn-press"
              >
                Lavage à l'eau
              </button>
              <button
                class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap btn-press"
              >
                Au kilo
              </button>
            </div>
          </div>

          <!-- Liste des articles -->
          <div class="px-6 space-y-2">
            <!-- Article 1 - sélectionné -->
            <div
              class="bg-white rounded-xl p-3 border-2 border-orange-500 flex items-center gap-3 animate-slide-up stagger-1"
            >
              <div
                class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl"
              >
                👔
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-slate-900">
                  Chemise simple
                </p>
                <p class="text-xs text-slate-500">1 500 FCFA / unité</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 btn-press"
                >
                  −
                </button>
                <span class="w-6 text-center font-bold text-slate-900">2</span>
                <button
                  class="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold btn-press"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Article 2 - non sélectionné -->
            <div
              class="bg-white rounded-xl p-3 border border-slate-100 flex items-center gap-3 animate-slide-up stagger-2 card-hover"
            >
              <div
                class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl"
              >
                👖
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-slate-900">Pantalon</p>
                <p class="text-xs text-slate-500">1 500 FCFA / unité</p>
              </div>
              <button
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 btn-press"
              >
                +
              </button>
            </div>

            <!-- Article 3 - sélectionné -->
            <div
              class="bg-white rounded-xl p-3 border-2 border-orange-500 flex items-center gap-3 animate-slide-up stagger-3"
            >
              <div
                class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl"
              >
                🎩
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-slate-900">
                  Costume 2 pièces
                </p>
                <p class="text-xs text-slate-500">3 000 FCFA / unité</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 btn-press"
                >
                  −
                </button>
                <span class="w-6 text-center font-bold text-slate-900">1</span>
                <button
                  class="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold btn-press"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Article 4 -->
            <div
              class="bg-white rounded-xl p-3 border border-slate-100 flex items-center gap-3 animate-slide-up stagger-4 card-hover"
            >
              <div
                class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl"
              >
                👗
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-slate-900">Robe simple</p>
                <p class="text-xs text-slate-500">2 500 FCFA / unité</p>
              </div>
              <button
                class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 btn-press"
              >
                +
              </button>
            </div>
          </div>

          <!-- Espace pour le panier -->
          <div class="h-32"></div>
        </div>

        <!-- ÉCRAN : DÉTAIL COMMANDE -->
        <div
          id="screen-order-detail"
          class="screen h-full overflow-y-auto scrollbar-hide pb-24"
        >
          <!-- Header -->
          <div class="px-6 pt-4 pb-4 flex items-center gap-3 animate-slide-up">
            <button
              onclick="showScreen('dashboard')"
              class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center btn-press"
            >
              <span>←</span>
            </button>
            <div class="flex-1">
              <h1 class="text-lg font-bold text-slate-900">CMD-2026-0042</h1>
              <p class="text-xs text-slate-500">Créée il y a 2 heures</p>
            </div>
            <button
              class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center btn-press"
            >
              <span>⋯</span>
            </button>
          </div>

          <!-- Statut -->
          <div class="px-6 mb-4">
            <div
              class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white animate-scale-in relative overflow-hidden"
            >
              <div
                class="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full"
              ></div>
              <div class="relative flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl animate-pulse-soft"
                >
                  ✅
                </div>
                <div>
                  <p class="text-xs text-green-100 font-medium">
                    Statut actuel
                  </p>
                  <p class="text-lg font-black">Commande prête</p>
                </div>
              </div>
              <div
                class="relative mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-green-100"
              >
                <span>📱</span>
                <span>Client notifié par WhatsApp à 10h42</span>
              </div>
            </div>
          </div>

          <!-- Client -->
          <div class="px-6 mb-4">
            <h2
              class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
            >
              Client
            </h2>
            <div
              class="bg-white rounded-xl p-3 border border-slate-100 flex items-center gap-3"
            >
              <div
                class="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold"
              >
                AK
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-slate-900">Awa Koné</p>
                <p class="text-xs text-slate-500">+225 07 08 09 10 11</p>
              </div>
              <button
                class="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center btn-press"
              >
                <span class="text-white text-sm">📞</span>
              </button>
            </div>
          </div>

          <!-- Articles -->
          <div class="px-6 mb-4">
            <h2
              class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
            >
              Articles (3)
            </h2>
            <div
              class="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100"
            >
              <div class="p-3 flex items-center gap-3">
                <span class="text-lg">👔</span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-slate-900">
                    Chemise simple
                  </p>
                  <p class="text-xs text-slate-500">Lavage à sec</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-slate-400">× 2</p>
                  <p class="text-sm font-bold text-slate-900">3 000</p>
                </div>
              </div>
              <div class="p-3 flex items-center gap-3">
                <span class="text-lg">🎩</span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-slate-900">
                    Costume 2 pièces
                  </p>
                  <p class="text-xs text-slate-500">Lavage à sec</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-slate-400">× 1</p>
                  <p class="text-sm font-bold text-slate-900">3 000</p>
                </div>
              </div>
              <div class="p-3 flex items-center gap-3">
                <span class="text-lg">👗</span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-slate-900">Robe simple</p>
                  <p class="text-xs text-slate-500">Lavage à sec</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-slate-400">× 1</p>
                  <p class="text-sm font-bold text-slate-900">2 500</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Total -->
          <div class="px-6 mb-4">
            <div
              class="bg-slate-900 rounded-2xl p-4 text-white flex justify-between items-center animate-slide-up"
            >
              <div>
                <p class="text-xs text-slate-400 font-medium">Total à payer</p>
                <p class="text-2xl font-black mt-0.5">
                  8 500
                  <span class="text-sm font-bold text-slate-400">FCFA</span>
                </p>
              </div>
              <span
                class="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-full font-semibold"
                >En attente</span
              >
            </div>
          </div>

          <!-- Actions -->
          <div class="px-6 space-y-2">
            <button
              class="w-full bg-orange-500 text-white py-4 rounded-xl font-bold btn-press hover:bg-orange-600 transition flex items-center justify-center gap-2 fab-pulse"
            >
              <span>💳</span> Demander le paiement Wave
            </button>
            <button
              class="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold btn-press hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <span>📱</span> Renvoyer le ticket WhatsApp
            </button>
          </div>
        </div>

        <!-- ÉCRAN : LISTE COMMANDES -->
        <div
          id="screen-orders-list"
          class="screen h-full overflow-y-auto scrollbar-hide pb-24"
        >
          <div class="px-6 pt-4 pb-4 animate-slide-up">
            <h1 class="text-xl font-bold text-slate-900">Commandes</h1>
            <p class="text-xs text-slate-500 mt-1">47 commandes ce mois</p>
          </div>

          <!-- Filtres -->
          <div class="px-6 mb-4">
            <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button
                class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white whitespace-nowrap btn-press"
              >
                Toutes
              </button>
              <button
                class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap btn-press"
              >
                Reçues
              </button>
              <button
                class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap btn-press"
              >
                En traitement
              </button>
              <button
                class="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 whitespace-nowrap btn-press"
              >
                Prêtes
              </button>
            </div>
          </div>

          <!-- Recherche -->
          <div class="px-6 mb-4">
            <div
              class="bg-slate-100 rounded-xl px-4 py-3 flex items-center gap-2"
            >
              <span class="text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Rechercher un client ou n° de commande..."
                class="bg-transparent flex-1 text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <!-- Liste -->
          <div class="px-6 space-y-2">
            <div
              class="bg-white rounded-xl p-3 border border-slate-100 card-hover cursor-pointer animate-slide-up stagger-1"
            >
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-bold text-slate-400">CMD-2026-0042</p>
                <span
                  class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold"
                  >PRÊTE</span
                >
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900">Awa Koné</p>
                  <p class="text-xs text-slate-500">
                    3 articles • Aujourd'hui 10h42
                  </p>
                </div>
                <p class="text-base font-black text-slate-900">8 500</p>
              </div>
            </div>

            <div
              class="bg-white rounded-xl p-3 border border-slate-100 card-hover cursor-pointer animate-slide-up stagger-2"
            >
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-bold text-slate-400">CMD-2026-0041</p>
                <span
                  class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold"
                  >EN TRAITEMENT</span
                >
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900">Yao Brou</p>
                  <p class="text-xs text-slate-500">
                    5 articles • Aujourd'hui 09h15
                  </p>
                </div>
                <p class="text-base font-black text-slate-900">12 000</p>
              </div>
            </div>

            <div
              class="bg-white rounded-xl p-3 border border-slate-100 card-hover cursor-pointer animate-slide-up stagger-3"
            >
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-bold text-slate-400">CMD-2026-0040</p>
                <span
                  class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold"
                  >REÇUE</span
                >
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Fatou Diallo
                  </p>
                  <p class="text-xs text-slate-500">2 articles • Hier 18h30</p>
                </div>
                <p class="text-base font-black text-slate-900">5 000</p>
              </div>
            </div>

            <div
              class="bg-white rounded-xl p-3 border border-slate-100 card-hover cursor-pointer animate-slide-up stagger-4"
            >
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-bold text-slate-400">CMD-2026-0039</p>
                <span
                  class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold"
                  >LIVRÉE</span
                >
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    Kouassi Bamba
                  </p>
                  <p class="text-xs text-slate-500">1 article • Hier 15h20</p>
                </div>
                <p class="text-base font-black text-slate-900">1 500</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ÉCRAN : SUCCÈS -->
        <div
          id="screen-success"
          class="screen h-full flex items-center justify-center px-6"
        >
          <div class="text-center w-full">
            <!-- Cercle de succès animé -->
            <div class="relative w-28 h-28 mx-auto mb-6">
              <div
                class="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30"
              ></div>
              <div
                class="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center animate-scale-in"
                style="animation-delay: 0.1s"
              >
                <svg
                  class="w-14 h-14 text-white"
                  viewBox="0 0 52 52"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M14 27l7.5 7.5L38 20"
                    style="stroke-dasharray: 100; stroke-dashoffset: 100; animation: checkmark 0.6s ease-out 0.3s forwards;"
                  />
                </svg>
              </div>
            </div>

            <h1
              class="text-2xl font-black text-slate-900 animate-slide-up stagger-3"
            >
              Commande enregistrée !
            </h1>
            <p class="text-sm text-slate-500 mt-2 animate-slide-up stagger-4">
              Le client a été notifié par WhatsApp
            </p>

            <div
              class="mt-6 bg-white rounded-2xl p-4 border border-slate-100 text-left animate-slide-up stagger-5"
            >
              <div
                class="flex justify-between items-center pb-3 border-b border-slate-100"
              >
                <span class="text-xs text-slate-400 font-medium"
                  >N° de commande</span
                >
                <span class="text-sm font-bold text-slate-900"
                  >CMD-2026-0042</span
                >
              </div>
              <div
                class="flex justify-between items-center py-3 border-b border-slate-100"
              >
                <span class="text-xs text-slate-400 font-medium">Client</span>
                <span class="text-sm font-bold text-slate-900">Awa Koné</span>
              </div>
              <div class="flex justify-between items-center pt-3">
                <span class="text-xs text-slate-400 font-medium">Total</span>
                <span class="text-lg font-black text-orange-500"
                  >8 500 FCFA</span
                >
              </div>
            </div>

            <div class="mt-6 space-y-2 animate-slide-up stagger-6">
              <button
                class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold btn-press hover:bg-slate-800 transition"
              >
                Retour au tableau de bord
              </button>
              <button
                class="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold btn-press hover:bg-slate-50 transition"
              >
                Créer une autre commande
              </button>
            </div>
          </div>
        </div>

        <!-- Barre panier flottante (uniquement sur new-order) -->
        <div
          id="cart-bar"
          class="hidden absolute bottom-20 left-4 right-4 bg-slate-900 rounded-2xl p-4 text-white shadow-2xl animate-slide-up"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-400">3 articles • Total</p>
              <p class="text-xl font-black">
                8 500 <span class="text-xs font-bold text-slate-400">FCFA</span>
              </p>
            </div>
            <button
              onclick="showScreen('success')"
              class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold btn-press transition"
            >
              Continuer →
            </button>
          </div>
        </div>

        <!-- Bottom Navigation -->
        <div
          class="absolute bottom-0 left-0 right-0 glass border-t border-slate-200/50 px-2 py-2"
        >
          <div class="grid grid-cols-5 gap-1">
            <button
              onclick="showScreen('dashboard')"
              class="nav-item active flex flex-col items-center py-2 rounded-xl"
            >
              <span class="text-lg">🏠</span>
              <span class="text-[10px] font-semibold mt-0.5">Accueil</span>
            </button>
            <button
              onclick="showScreen('orders-list')"
              class="nav-item flex flex-col items-center py-2 rounded-xl"
            >
              <span class="text-lg">📋</span>
              <span class="text-[10px] font-semibold mt-0.5">Commandes</span>
            </button>
            <button
              onclick="showScreen('new-order')"
              class="flex flex-col items-center py-2 relative"
            >
              <div
                class="absolute -top-6 w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg btn-press fab-pulse"
              >
                <span class="text-2xl font-light">+</span>
              </div>
              <span class="text-[10px] font-semibold mt-8 text-orange-500"
                >Nouveau</span
              >
            </button>
            <button
              onclick="showScreen('orders-list')"
              class="nav-item flex flex-col items-center py-2 rounded-xl"
            >
              <span class="text-lg">👥</span>
              <span class="text-[10px] font-semibold mt-0.5">Clients</span>
            </button>
            <button class="nav-item flex flex-col items-center py-2 rounded-xl">
              <span class="text-lg">⚙️</span>
              <span class="text-[10px] font-semibold mt-0.5">Réglages</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <script>
      function showScreen(name) {
        // Cacher tous les écrans
        document
          .querySelectorAll(".screen")
          .forEach((s) => s.classList.remove("active"));
        // Afficher le bon
        document.getElementById("screen-" + name).classList.add("active");

        // Mettre à jour les boutons de contrôle
        document.querySelectorAll(".screen-btn").forEach((btn) => {
          if (btn.dataset.screen === name) {
            btn.classList.add("bg-orange-500", "text-white");
            btn.classList.remove("bg-slate-100", "text-slate-700");
          } else {
            btn.classList.remove("bg-orange-500", "text-white");
            btn.classList.add("bg-slate-100", "text-slate-700");
          }
        });

        // Mettre à jour la navigation bottom
        document
          .querySelectorAll(".nav-item")
          .forEach((item) => item.classList.remove("active"));

        // Afficher la barre panier uniquement sur new-order
        const cartBar = document.getElementById("cart-bar");
        if (name === "new-order") {
          cartBar.classList.remove("hidden");
        } else {
          cartBar.classList.add("hidden");
        }
      }

      // Animation des stagger au chargement initial
      window.addEventListener("load", () => {
        document.querySelectorAll(".animate-slide-up").forEach((el, i) => {
          el.style.opacity = "0";
          setTimeout(() => {
            el.style.opacity = "1";
          }, 50 * i);
        });
      });
    </script>
  </body>
</html>
```

---

## 🎨 Ce que cette maquette démontre

### Animations implémentées

| Animation         | Usage                               | Effet                                         |
| ----------------- | ----------------------------------- | --------------------------------------------- |
| **slide-up**      | Apparition des cartes KPI, articles | Les éléments montent en douceur depuis le bas |
| **scale-in**      | Confirmation de sélection, succès   | Zoom subtil de 0.9 à 1                        |
| **fade-in**       | Changement d'écran                  | Fondu enchaîné fluide                         |
| **pulse-soft**    | Icône de statut "Prêt"              | Respiration lente pour attirer l'œil          |
| **ring-pulse**    | Bouton flottant "+"                 | Onde orange qui se propage                    |
| **checkmark**     | Confirmation commande               | Tracé du check qui se dessine                 |
| **stagger-1 à 6** | Listes d'éléments                   | Apparition en cascade (effet premium)         |
| **card-hover**    | Cartes interactives                 | Élévation douce au survol                     |
| **btn-press**     | Tous les boutons                    | Réduction à 96% au clic (feedback tactile)    |
| **bounce-subtle** | Éléments d'attention                | Léger rebond                                  |

### Principes de design appliqués

1. **Mobile-first absolu** : tout est pensé pour un écran de 375px de large
2. **Boutons ≥ 44px** : conformes aux règles tactiles
3. **Feedback immédiat** sur chaque interaction
4. **Hiérarchie visuelle claire** : le CA en gros, les détails en petit
5. **Couleurs ivoiriennes** : orange vif (accent) + bleu nuit (confiance)
6. **Statuts colorés** : vert = prêt, bleu = en cours, gris = reçu, jaune = attente paiement
7. **Bouton flottant central** : toujours accessible pour créer une commande

### Écrans démontrés

1. **Dashboard** — KPIs, commandes à livrer
2. **Nouvelle commande** — Flow 3 étapes, sélection articles, panier flottant
3. **Détail commande** — Statut, articles, actions paiement
4. **Liste commandes** — Filtres, recherche, cartes cliquables
5. **Confirmation** — Animation de succès, récapitulatif

---

## 🚀 Comment l'utiliser

1. Copiez le code dans un fichier `maquette.html`
2. Ouvrez-le dans Chrome ou Safari
3. Cliquez sur les boutons en haut pour naviguer entre les écrans
4. Utilisez les onglets en bas (navigation mobile) pour tester l'expérience réelle
5. Testez sur votre téléphone en réduisant la fenêtre

---

Souhaitez-vous que je génère maintenant le **code React/Next.js réel** de l'un de ces écrans (avec les Server Actions et l'intégration Supabase), ou que je crée d'autres écrans (articles, clients, paramètres) dans le même style ?
