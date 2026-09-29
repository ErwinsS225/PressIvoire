-- =============================================================================
--  PressingPro — Migration 007 : file d'envoi des notifications
--
--  Le module d'envoi (lib/notifications-server.ts) a besoin de deux informations
--  que la table `notifications` de 001 ne stockait pas :
--
--    - `attempted_at`    : quand la derniere tentative a eu lieu. Sans elle,
--                          une ligne restee `sending` parce que le process est
--                          mort en vol est indiscernable d'un envoi en cours —
--                          la relancer a l'aveugle enverrait un DEUXIEME SMS au
--                          client, qui a deja recu le premier.
--
--    - `next_attempt_at` : a partir de quand la ligne est eligible. C'est ce qui
--                          espace les tentatives (1 minute, puis 5) au lieu de
--                          bruler du credit en trois clics.
--
--  Aucune donnee existante n'est modifiee : les deux colonnes sont nullables, et
--  une ligne sans `next_attempt_at` est consideree eligible immediatement.
--
--  Appliquer : supabase db push
--              OU node scripts/db-apply.mjs --file supabase/migrations/007_notification_queue.sql
--  Idempotent : peut etre rejoue sans effet de bord.
-- =============================================================================

alter table public.notifications
  add column if not exists attempted_at    timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists payload         jsonb;

comment on column public.notifications.attempted_at is
  'Debut de la derniere tentative d''envoi (regle de reprise des envois bloques).';
comment on column public.notifications.next_attempt_at is
  'La ligne est eligible a partir de cet instant ; NULL = eligible tout de suite.';
comment on column public.notifications.payload is
  'Donnees propres au canal, notamment { "params": [...] } : les parametres positionnels du gabarit WhatsApp. Stockes a la mise en file pour que l''envoi ne depende plus de l''etat courant de la commande.';

-- L'index de 001 est (status, created_at) : il sert le JOURNAL, trie par date.
-- Celui-ci sert la FILE, qui filtre les etats actifs : un index partiel reste
-- petit meme quand l'historique grossit.
create index if not exists notifications_queue_idx
  on public.notifications (status, next_attempt_at)
  where status in ('queued', 'failed', 'sending');


-- -----------------------------------------------------------------------------
-- RLS : la file devient pilotable depuis l'application
-- -----------------------------------------------------------------------------
-- 001 ne donnait qu'une policy de LECTURE, avec ce commentaire : « file
-- d'attente geree par les Edge Functions (service_role) ». Or ce module
-- n'utilise PAS la cle service_role — elle a ete retiree du chemin applicatif a
-- l'onboarding (Phase 2), et la remettre pour ecrire une file de SMS rendrait
-- une erreur de code capable d'ecrire chez n'importe quel pressing.
--
-- La file est donc pilotee par des Server Actions, qui s'executent avec la
-- session de l'utilisateur : sans policy d'ecriture, chaque insertion
-- echouerait. Portee volontairement etroite — le personnel DU pressing courant,
-- en lecture comme en ecriture. Un compte « client » reste sans acces.
--
-- `drop policy if exists` : la migration doit pouvoir etre rejouee.

drop policy if exists "notifications: ecriture par le personnel" on public.notifications;
create policy "notifications: ecriture par le personnel"
  on public.notifications for insert to authenticated
  with check (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
  );

drop policy if exists "notifications: mise a jour par le personnel" on public.notifications;
create policy "notifications: mise a jour par le personnel"
  on public.notifications for update to authenticated
  using (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
  )
  with check (
    pressing_id = public.app_current_pressing_id()
    and public.app_is_staff()
  );

-- Les droits de table viennent normalement des privileges par defaut de
-- Supabase (comme pour `orders`, `clients`…). On les rend explicites ici : c'est
-- ce qui manquait pour que la migration soit auto-suffisante, et sans eux la
-- policy ne sert a rien.
grant insert, update on public.notifications to authenticated;
