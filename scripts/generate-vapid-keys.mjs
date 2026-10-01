/**
 * Generation des cles VAPID pour les notifications push.
 *
 * Aucune dependance externe : Node expose deja ECDSA P-256 via
 * `crypto.generateKeyPairSync`. `web-push` ferait la meme chose en ajoute une
 * seule a la production, pour une operation a lancer une fois dans la vie d'un
 * projet.
 *
 *   npm run push:keys
 *
 * ## Avertissement
 *
 * **Ces cles se generent UNE SEULE FOIS.** Changer la cle privee invalide
 * tous les abonnements deja enregistres : chaque appareil recevra des
 * notifications push expirant avec l'ancienne cle, silencieusement. Il
 * faudrait alors faire unsubcribe/re-subscribe par tous les utilisateurs.
 *
 * La cle privee va dans `VAPID_PRIVATE_KEY` (variable d'environnement du
 * serveur, cote Edge Function ou tache planifiee). La cle PUBLIQUE va dans
 * `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, car le navigateur en a besoin pour
 * s'abonner.
 */
import crypto from "node:crypto";

/*
 * `VAPID_SUBJECT` — SANS VALEUR PAR DEFAUT, VOLONTAIREMENT.
 *
 * C'est l'adresse de contact du serveur de push : le service (Mozilla, Google)
 * s'en sert pour prevenir le proprietaire si ses envois saturent un quota ou
 * si l'application se comporte mal. Ce n'est ni un secret, ni une adresse
 * d'utilisateur — mais elle doit EXISTER, puisque c'est le canal de secours.
 *
 * Aucune valeur n'est inventee ici. Une premiere version proposait
 * `mailto:bonjour@pressingpro.ci`, recopiee du contenu de la landing page :
 * or ce domaine n'est pas encore achete (il ne resout pas en DNS), donc
 * cette boite n'existe pas. Une adresse de contact inventee est pire qu'une
 * variable absente — elle semble configuree, et le service de push ne pourra
 * recontacter personne.
 *
 * A fournir, donc :
 *
 *   VAPID_SUBJECT=mailto:ton.adresse.reelle@gmail.com node scripts/generate-vapid-keys.mjs
 *
 * Le format est impose par la specification (RFC 8292) : `mailto:` ou
 * `https://`. Une adresse nue, sans prefixe, fait rejeter l'abonnement.
 */
const SUBJECT = process.env.VAPID_SUBJECT;

if (!SUBJECT) {
  console.error(
    "\n  VAPID_SUBJECT est obligatoire.\n\n" +
      "  Indiquez une adresse de contact REELLEMENT lue, qui reçoit votre courrier :\n\n" +
      "    VAPID_SUBJECT=mailto:vous@gmail.com npm run push:keys\n\n" +
      "  C'est le canal par lequel le service de push vous previendra en cas de\n" +
      "  quota sature ou d'anomalie. Aucune valeur n'est devinee ici : une adresse\n" +
      "  qui n'existe pas ne peut pas servir a etre contacte.\n",
  );
  process.exit(1);
}

if (!/^mailto:[^\s@]+@[^\s@]+$|^https:\/\/\S+$/.test(SUBJECT)) {
  console.error(
    `\n  Format invalide : « ${SUBJECT} »\n\n` +
      "  La specification VAPID (RFC 8292) impose soit un « mailto: », soit une\n" +
      "  URL « https:// ». Une adresse nue fera rejeter l'abonnement par Chrome.\n" +
      "  Exemple : mailto:vous@gmail.com\n",
  );
  process.exit(1);
}

function generateVapidKeys() {
  // P-256 (prime256v1) et non ed25519 : ed25519 n'est pas accepte par la
  // specification VAPID (RFC 8292), qui impose une courbe NIST.
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64url"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64url"),
  };
}

const { publicKey, privateKey } = generateVapidKeys();

console.log("\nCles VAPID generees pour PressingPro.\n");
console.log(`  NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`  VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`  VAPID_SUBJECT=${SUBJECT}`);
console.log("");

console.log(
  "\nA poser maintenant :\n" +
    "  - sur Vercel, dans Settings > Environment Variables, pour les DEUX premieres.\n" +
    "  - dans les secrets de l'Edge Function d'envoi, si l'envoi tourne la-bas.\n",
);
console.log(
  "La cle privee ne doit JAMAIS etre prefixee par NEXT_PUBLIC_ : elle partirait\n" +
    "dans le bundle du navigateur. Aucun depot, aucun commit.",
);