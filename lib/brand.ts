/**
 * Identite de marque — source unique de verite.
 *
 * ## Pourquoi ce fichier existe
 *
 * L'application et la landing page sont deux deploiements distincts d'un meme
 * produit. Elles ne partagent aucun code, donc rien ne les obligeait a
 * presenter la meme marque : l'application est restee en indigo `#4f46e5`
 * pendant que la landing etait verte. Un visiteur qui passe de l'une a
 * l'autre ne voit pas le meme produit — or la conversion se joue precisement
 * au moment de ce passage.
 *
 * Ce fichier n'est donc qu'une declaration, pas un verrou : la seule chose
 * qui tient vraiment est `lib/brand.test.ts`, qui compare ces valeurs a
 * celles du manifeste. Une couleur divergeante fait echouer le test.
 *
 * ## Pourquoi la valeur de theme_color est le fond, pas la marque
 *
 * Android peint la barre d'etat et l'ecran de demarrage avec
 * `theme_color`, iOS avec `background_color`. Or la premiere impression
 * visuelle est cette bande, pas le logo : si elle porte une couleur absente du
 * reste du produit, c'est elle qui donne l'impression d'une autre
 * application. On aligne donc ces deux valeurs sur le **fond** reel de
 * l'interface (`--background`), et on garde la marque pour l'icone — c'est
 * elle que le systeme affiche sur l'ecran d'accueil.
 */

/** Fond de l'interface en clair. Doit correspondre a `--background` de `globals.css`. */
export const BRAND_CANVAS = "#f8f7f2";

/** Fond de l'interface en sombre. Doit correspondre a `--background` de `globals.css`. */
export const BRAND_CANVAS_DARK = "#0d1614";

/** Vert de marque : la landing, l'icone et l'accent de l'application. */
export const BRAND_GREEN = "#126c54";

/** Nom affiche sous l'icone, sur l'ecran d'accueil. */
export const BRAND_NAME = "PressingPro";

/**
 * Couleur de la barre d'etat du navigateur, pour le theme CLAIR.
 *
 * Une seule valeur est declaree par la spec, donc la couleur ne peut pas
 * suivre le basculement clair / sombre de l'application. On privilegie le
 * clair, parce que le sombre est moins courant et parce qu'une bande claire
 * sur un fond sombre serait surtout genante.
 */
export const BRAND_THEME_COLOR = BRAND_CANVAS;