update public.app_versions
set active = false
where coalesce(plateforme, 'web') in ('web', 'all');

insert into public.app_versions (
  version_code,
  version_name,
  titre,
  message,
  url_update,
  obligatoire,
  plateforme,
  active
)
values (
  101,
  '0.1.1',
  'Nouvelle mise a jour disponible',
  'L''application a ete mise a jour. Clique sur "Mettre a jour" pour charger la derniere version.',
  null,
  false,
  'web',
  true
);
