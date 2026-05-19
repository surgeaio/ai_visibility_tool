-- GSC connections must be per brand (client), not shared across all brands for a user+site.

drop index if exists idx_gsc_connections_user_site;

create unique index if not exists idx_gsc_connections_brand_site
  on gsc_connections (brand_id, site_url);
