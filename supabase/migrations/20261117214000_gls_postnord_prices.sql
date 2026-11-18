-- Priser FRA Shipmondo inklusive moms, FØR EquiShoppers 10 kr. rabat.
-- Ingen ændringer af eksisterende DAO-produkter.
begin;
with products(carrier, name, package_group, min_grams, max_grams, price_amount, sort_order) as (
  values
    ('gls', 'GLS PakkeShop', 'gls_shop', 0, 1000, 4350, 10),
    ('gls', 'GLS PakkeShop', 'gls_shop', 1000, 5000, 4975, 20),
    ('gls', 'GLS PakkeShop', 'gls_shop', 5000, 10000, 7300, 30),
    ('gls', 'GLS PakkeShop', 'gls_shop', 10000, 15000, 9250, 40),
    ('postnord', 'PostNord Service Point', 'postnord_shop', 150, 1000, 4725, 10),
    ('postnord', 'PostNord Service Point', 'postnord_shop', 1000, 5000, 7300, 20),
    ('postnord', 'PostNord Service Point', 'postnord_shop', 5000, 10000, 7850, 30),
    ('postnord', 'PostNord Service Point', 'postnord_shop', 10000, 15000, 9225, 40)
)
insert into public.shipping_products (
  id, carrier, name, product_code, package_group, min_weight_grams, max_weight_grams,
  price_amount, currency, vat_included, delivery_method, active, outbound_enabled,
  return_enabled, max_length_cm, max_width_cm, max_height_cm, max_girth_plus_length_cm,
  size_rule_text, sort_order, description
)
select gen_random_uuid(), carrier, name || ' · op til ' || (max_grams / 1000) || ' kg',
       upper(carrier) || '_SHOP_' || (max_grams / 1000) || 'KG',
       package_group, min_grams, max_grams,
       price_amount, 'dkk', true, 'printable_label', true, true, false,
       80, 80, 80, 240, 'Vægt og mål skal kontrolleres efter transportørens vilkår.',
       sort_order, 'Levering til pakkeshop. QR kun hvis Shipmondo udsteder den.'
from products
where not exists (
  select 1 from public.shipping_products p
  where p.product_code = upper(products.carrier) || '_SHOP_' || (products.max_grams / 1000) || 'KG'
);
commit;
