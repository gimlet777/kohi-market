-- ─── KOHĪ Seed Data ───────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor to replace all marketplace products.
-- roaster_id is NULL — products appear on the marketplace but are not owned
-- by an auth account. Roasters can claim products by updating roaster_id after
-- signing up. Café Roaster batches should be added via the roaster dashboard.
-- ──────────────────────────────────────────────────────────────────────────────

-- Clear dependent tables first to avoid FK violations
DELETE FROM batches;
DELETE FROM products;

-- ── Glitch Coffee & Roasters — Tokyo — Roastery ───────────────────────────────
-- Akihabara; known for extreme light roasts and surgical sourcing.

INSERT INTO products
  (roaster_id, roaster_name, region, product_name, product_name_jp,
   origin, process, roast_level, altitude, flavour_notes,
   description, price, formats, seller_type, batch_info)
VALUES
(
  NULL, 'Glitch Coffee & Roasters', 'Tokyo', 'Beriti Natural', NULL,
  'Ethiopia', 'Natural', 'Light', '1,900–2,200m',
  ARRAY['Blueberry', 'Hibiscus', 'Dark chocolate'],
  'From the Beriti washing station deep in Yirgacheffe''s Gedeo zone, this natural lot spends 21 days drying on raised beds, concentrating a vivid fruit character. Glitch roasts to just above first crack to hold every layer of berry intensity and keep the floral aromatics intact.',
  1800,
  '[{"name":"Whole Bean","grams":100,"price":1800}]'::jsonb,
  'Roastery', NULL
),
(
  NULL, 'Glitch Coffee & Roasters', 'Tokyo', 'Kenya Karimikui AA', NULL,
  'Kenya', 'Washed', 'Light', '1,700–1,900m',
  ARRAY['Blackcurrant', 'Grapefruit', 'Black tea'],
  'Karimikui factory in Kirinyaga county collects SL28 and SL34 cherry from smallholders on the slopes of Mount Kenya. Double fermentation and a slow, shaded dry produce the transparent, highly structured cup that defines Kenyan filter at its finest. Glitch sources a single 60 kg lot per season.',
  2400,
  '[{"name":"Whole Bean","grams":100,"price":2400}]'::jsonb,
  'Roastery', NULL
);

-- ── Fuglen Tokyo — Tokyo — Roastery ──────────────────────────────────────────
-- Tomigaya; Scandinavian-style specialty, direct trade, annual Japan–Norway sourcing trips.

INSERT INTO products
  (roaster_id, roaster_name, region, product_name, product_name_jp,
   origin, process, roast_level, altitude, flavour_notes,
   description, price, formats, seller_type, batch_info)
VALUES
(
  NULL, 'Fuglen Tokyo', 'Tokyo', 'Ethiopia Nano Challa', NULL,
  'Ethiopia', 'Washed', 'Light', '2,000–2,100m',
  ARRAY['Peach', 'Bergamot', 'Honey'],
  'Nano Challa cooperative sits in Agaro district in Jimma zone, where smallholder farmers deliver ripe cherry daily to a meticulously run washing station. Fuglen''s Scandinavian-influenced roast highlights the station''s characteristically clean, floral profile — delicate, tea-like, and endlessly nuanced in the cup.',
  2400,
  '[{"name":"Whole Bean","grams":200,"price":2400},{"name":"Drip Bag","grams":120,"price":2800}]'::jsonb,
  'Roastery', NULL
),
(
  NULL, 'Fuglen Tokyo', 'Tokyo', 'Colombia Finca El Paraíso', NULL,
  'Colombia', 'Double Anaerobic Washed', 'Light', '1,750m',
  ARRAY['Passion fruit', 'Rose', 'Pomelo'],
  'Diego Bermúdez''s Finca El Paraíso in Huila has become one of Colombia''s most celebrated experimental farms. This double anaerobic washed lot undergoes 72-hour inoculated fermentation before washing, producing an intensely aromatic, fruit-forward cup that blurs the boundary between coffee and natural wine.',
  3200,
  '[{"name":"Whole Bean","grams":200,"price":3200}]'::jsonb,
  'Roastery', NULL
);

-- ── Takamura Wine & Coffee Roasters — Osaka — Roastery ────────────────────────
-- Honmachi; wine-collector aesthetic applied to green sourcing and roast development.

INSERT INTO products
  (roaster_id, roaster_name, region, product_name, product_name_jp,
   origin, process, roast_level, altitude, flavour_notes,
   description, price, formats, seller_type, batch_info)
VALUES
(
  NULL, 'Takamura Wine & Coffee Roasters', 'Osaka', 'Ethiopia Shakiso Natural', NULL,
  'Ethiopia', 'Natural', 'Light', '1,900–2,100m',
  ARRAY['Strawberry jam', 'Peach tea', 'Magnolia'],
  'From Guji zone''s Shakiso district — an area producing some of Ethiopia''s most expressive naturals. Takamura''s approach mirrors their fine-wine curation: sourcing sub-10 kg parcels where drying conditions are controlled day-by-day. The result is a perfumed, layered cup with a silk-textured body.',
  2200,
  '[{"name":"Whole Bean","grams":100,"price":2200},{"name":"Drip Bag","grams":140,"price":2600}]'::jsonb,
  'Roastery', NULL
),
(
  NULL, 'Takamura Wine & Coffee Roasters', 'Osaka', 'Panama Elida Estate Natural', NULL,
  'Panama', 'Natural', 'Light', '1,600–1,900m',
  ARRAY['Tropical fruit', 'Jasmine', 'White grape'],
  'The Lamastus family''s Elida Estate on the slopes of Barú volcano is one of the world''s most decorated farms. This natural lot is solar-dried for 30 days under precise humidity controls. The result is a layered, perfumed cup of extraordinary clarity — the coffee equivalent of a grand cru.',
  4200,
  '[{"name":"Whole Bean","grams":100,"price":4200}]'::jsonb,
  'Roastery', NULL
);

-- ── Leaves Coffee Roasters — Tokyo — Roastery ─────────────────────────────────
-- Shimokitazawa; accessible specialty, neighbourhood-first community roastery.

INSERT INTO products
  (roaster_id, roaster_name, region, product_name, product_name_jp,
   origin, process, roast_level, altitude, flavour_notes,
   description, price, formats, seller_type, batch_info)
VALUES
(
  NULL, 'Leaves Coffee Roasters', 'Tokyo', 'Ethiopia Yirgacheffe G1', NULL,
  'Ethiopia', 'Washed', 'Light', '1,800–2,100m',
  ARRAY['Jasmine', 'Lemon', 'Earl Grey'],
  'A benchmark washed Yirgacheffe sourced from a cooperative in the Gedeo zone, where the microclimate and altitude combine to produce naturally occurring floral and citrus aromatics. Leaves roasts lightly to keep the cup bright, transparent, and unmistakably Ethiopian — an ideal introduction to specialty filter coffee.',
  1900,
  '[{"name":"Whole Bean","grams":200,"price":1900},{"name":"Drip Bag","grams":120,"price":2300}]'::jsonb,
  'Roastery', NULL
),
(
  NULL, 'Leaves Coffee Roasters', 'Tokyo', 'Guatemala Vista Hermosa Honey', NULL,
  'Guatemala', 'Honey', 'Medium', '1,500–1,800m',
  ARRAY['Brown sugar', 'Peach', 'Hazelnut'],
  'Grown above the cloud line in Huehuetenango''s high plateau, Vista Hermosa''s honey-processed lots are dried with 50% of the mucilage intact, giving a structured sweetness and smooth body. Leaves roasts to a gentle medium that amplifies the caramel character while keeping stone-fruit notes vivid and clean.',
  1700,
  '[{"name":"Whole Bean","grams":200,"price":1700},{"name":"Drip Bag","grams":120,"price":2000}]'::jsonb,
  'Roastery', NULL
);

-- ── Heart's Light Coffee — Tokyo — Café Roaster ───────────────────────────────
-- Small-batch, roast-to-order; add batches via the roaster dashboard.

INSERT INTO products
  (roaster_id, roaster_name, region, product_name, product_name_jp,
   origin, process, roast_level, altitude, flavour_notes,
   description, price, formats, seller_type, batch_info)
VALUES
(
  NULL, 'Heart''s Light Coffee', 'Tokyo', 'Colombia Geisha Washed', NULL,
  'Colombia', 'Washed', 'Light', '1,900–2,000m',
  ARRAY['Jasmine', 'White peach', 'Bergamot'],
  'Heart''s Light sources this Geisha from a single-family farm in Antioquia, roasting in weekly batches of 15 kg or fewer. The washed process lets the variety''s celebrated floral and stone-fruit character emerge with exceptional purity. Every bag is roasted to order and dispatched within 48 hours.',
  3600,
  '[{"name":"Whole Bean","grams":100,"price":3600}]'::jsonb,
  'Café Roaster', NULL
),
(
  NULL, 'Heart''s Light Coffee', 'Tokyo', 'Ethiopia Hambela Natural', NULL,
  'Ethiopia', 'Natural', 'Light', '2,100–2,300m',
  ARRAY['Blueberry', 'Lemon curd', 'Brown sugar'],
  'Hambela Wamena in Guji zone sits above 2,100 m — among the highest growing elevations in Ethiopia. The slow ripening produces a dense cherry with concentrated sugars; the 25-day natural dry locks them in. Heart''s Light roasts this at the lightest end of the dial to preserve the wild, vivid fruit.',
  2800,
  '[{"name":"Whole Bean","grams":100,"price":2800}]'::jsonb,
  'Café Roaster', NULL
);

-- ── LiLo Coffee Roasters — Osaka — Café Roaster ──────────────────────────────
-- Shinsaibashi; micro-batch roaster, exclusive annual allocations, add batches via dashboard.

INSERT INTO products
  (roaster_id, roaster_name, region, product_name, product_name_jp,
   origin, process, roast_level, altitude, flavour_notes,
   description, price, formats, seller_type, batch_info)
VALUES
(
  NULL, 'LiLo Coffee Roasters', 'Osaka', 'Panama Hartmann Geisha Natural', NULL,
  'Panama', 'Natural', 'Light', '1,600–1,800m',
  ARRAY['Lychee', 'Mango', 'Orange blossom'],
  'The Hartmann family has farmed on the slopes of Volcán Barú for four generations. This natural Geisha is shade-grown under native oak and dried on raised beds for 25 days. LiLo secures this as an exclusive annual allocation — 30 kg per season. When this batch is gone, it''s gone until next harvest.',
  5200,
  '[{"name":"Whole Bean","grams":100,"price":5200}]'::jsonb,
  'Café Roaster', NULL
),
(
  NULL, 'LiLo Coffee Roasters', 'Osaka', 'Kenya Kiangoi AA', NULL,
  'Kenya', 'Washed', 'Light', '1,700–1,900m',
  ARRAY['Redcurrant', 'Tamarind', 'Rosehip'],
  'Kiangoi factory in Nyeri county sits at the foot of the Aberdare Range, one of Kenya''s most revered growing districts. SL28 and Batian varietals undergo a 72-hour cold fermentation before washing, producing the intensely winey, bright-acid cup that defines Nyeri''s reputation. A seasonal allocation roasted in 10 kg batches.',
  2800,
  '[{"name":"Whole Bean","grams":100,"price":2800}]'::jsonb,
  'Café Roaster', NULL
);
