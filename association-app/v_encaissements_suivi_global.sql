create or replace view public.v_encaissements_suivi_global as

with operations_all as (
  select
    coalesce(eo.membre_id, ep.preinscription_id) as personne_id,
    case 
      when eo.membre_id is not null then 'MEMBRE'
      else 'PREINSCRIT'
    end as type_personne,
    make_date(es.annee, es.mois, 1) as mois_reference,
    lower(trim(ev.rubrique_nom)) as rubrique_nom,
    sum(ev.montant) as montant_encaisse
  from enc_operations eo
  join enc_sessions es on es.id = eo.session_id
  join enc_ventilations ev on ev.operation_id = eo.id
  left join encaissement_profils ep on ep.preinscription_id = eo.preinscrit_id
  group by
    coalesce(eo.membre_id, ep.preinscription_id),
    case when eo.membre_id is not null then 'MEMBRE' else 'PREINSCRIT' end,
    make_date(es.annee, es.mois, 1),
    lower(trim(ev.rubrique_nom))
),

attendus_all as (
  select
    m.id as personne_id,
    'MEMBRE' as type_personne,
    em.mois as mois_reference,
    lower(trim(er.nom)) as rubrique_nom,
    er.id as rubrique_id,
    er.code as rubrique_code,
    er.nom as rubrique_nom_original,
    ea.montant_attendu
  from encaissement_attendus ea
  join membres m on m.id = ea.membre_id
  join encaissement_mois em on em.id = ea.mois_id
  join encaissement_rubriques er on er.id = ea.rubrique_id

  union all

  select
    mp.id as personne_id,
    'PREINSCRIT' as type_personne,
    em.mois as mois_reference,
    lower(trim(er.nom)) as rubrique_nom,
    er.id,
    er.code,
    er.nom,
    eap.montant_attendu
  from encaissement_attendus_preinscrits eap
  join encaissement_profils ep on ep.id = eap.profil_id
  join membres_preinscriptions mp on mp.id = ep.preinscription_id
  join encaissement_mois em on em.id = eap.mois_id
  join encaissement_rubriques er on er.id = eap.rubrique_id
),

fusion as (
  select
    coalesce(a.personne_id, o.personne_id) as personne_id,
    coalesce(a.type_personne, o.type_personne) as type_personne,
    coalesce(a.mois_reference, o.mois_reference) as mois_reference,
    coalesce(a.rubrique_nom, o.rubrique_nom) as rubrique_nom,
    coalesce(a.rubrique_id, null) as rubrique_id,
    coalesce(a.rubrique_code, null) as rubrique_code,
    coalesce(a.rubrique_nom_original, o.rubrique_nom) as rubrique_nom_final,
    coalesce(a.montant_attendu, 0) as montant_attendu,
    coalesce(o.montant_encaisse, 0) as montant_encaisse
  from attendus_all a
  full outer join operations_all o
    on a.personne_id = o.personne_id
   and a.type_personne = o.type_personne
   and a.mois_reference = o.mois_reference
   and a.rubrique_nom = o.rubrique_nom
)

select
  f.personne_id,
  case 
    when f.type_personne = 'MEMBRE' then m.nom_complet
    else mp.nom_complet
  end as nom_complet,
  case 
    when f.type_personne = 'MEMBRE' then m.telephone
    else mp.telephone
  end as telephone,
  case 
    when f.type_personne = 'MEMBRE' then m.email
    else mp.email
  end as email,
  f.type_personne,
  f.mois_reference,
  f.rubrique_id,
  f.rubrique_code,
  f.rubrique_nom_final as rubrique_nom,
  f.montant_attendu,
  f.montant_encaisse,
  (f.montant_attendu - f.montant_encaisse) as reste,
  case
    when f.montant_encaisse >= f.montant_attendu then 'A jour'
    else 'En retard'
  end as statut
from fusion f
left join membres m on m.id = f.personne_id and f.type_personne = 'MEMBRE'
left join membres_preinscriptions mp on mp.id = f.personne_id and f.type_personne = 'PREINSCRIT';
