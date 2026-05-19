-- Per-brand competitor uniqueness + circle.healthcare seed rivals

create unique index if not exists idx_competitors_brand_name_unique
  on competitors (brand_id, lower(competitor_name));

insert into competitors (brand_id, competitor_name, domain)
select b.id, v.competitor_name, v.domain
from brands b
cross join (
  values
    ('ThoroughCare', 'thoroughcare.net'),
    ('HealthArc', 'healtharc.io'),
    ('CareSimple', 'caresimple.com'),
    ('HealthSnap', 'welcome.healthsnap.io'),
    ('ChartSpan', 'chartspan.com'),
    ('Prevounce', 'blog.prevounce.com')
) as v(competitor_name, domain)
where (
  b.domain ilike '%circle.healthcare%'
  or b.website ilike '%circle.healthcare%'
  or b.name ilike '%circle%healthcare%'
  or b.name ilike '%circle healthcare%'
)
and not exists (
  select 1
  from competitors c
  where c.brand_id = b.id
    and lower(c.competitor_name) = lower(v.competitor_name)
);
