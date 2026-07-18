-- NOOR PERFUMES — seed the 7 real products.
-- Run after schema.sql. Prices are in euro cents (incl. 21% BTW).
-- image_path is repo-relative; Vercel serves it. Swap to a Supabase Storage
-- public URL later if you prefer.

insert into public.products (id, name, volume, notes, fun_fact, price_cents, image_path, sort_order) values
('memorable','Memorable','30ml','Red saffron, ambergris, praline',
 'Ambergris is one of the rarest materials in perfumery — historically worth more than gold by weight. Here it anchors the praline sweetness so the scent lingers for hours.',
 12800,'assets/img/memorable.jpg',1),
('citradelic','Citradelic','30ml','Bergamot, mint, blue iris',
 'Nearly all of the world''s bergamot grows on one narrow strip of Calabrian coastline in Italy — the reason citrus openings like this feel instantly Mediterranean.',
 11200,'assets/img/citradelic.jpg',2),
('velvet-sugar-rush','Velvet Sugar Rush','30ml','Caramel, raspberry, musk',
 'Gourmand scents play with the brain''s appetite centres — sweet notes are perceived as warmer and closer on skin than on paper, so this one is made to be worn, not sniffed.',
 11800,'assets/img/velvet-sugar-rush.jpg',3),
('amber-lait','Amber Lait','30ml','Amber, creamy wood, vanilla',
 '"Amber" is not a single ingredient but an accord — traditionally labdanum, benzoin and vanilla — invented by perfumers to capture the warmth of fossilised resin.',
 12200,'assets/img/amber-lait.jpg',4),
('oud-mirage','Oud Mirage','30ml','Oud, saffron, smoked honey',
 'Oud forms when Aquilaria trees defend themselves against a fungus. Only a small fraction of wild trees ever produce it — which is why perfumers call it liquid gold.',
 13500,'assets/img/oud-mirage.jpg',5),
('luluat-al-oud','Luluat Al Oud','55ml','Oud, rose petal, oriental spices',
 '"Luluat" means pearl in Arabic. Rose over oud is the signature pairing of Middle-Eastern perfumery, layered for centuries in traditional attar form.',
 16800,'assets/img/luluat-al-oud.jpg',6),
('century','Century','100ml','Black iris, leather, tobacco leaves',
 'Iris (orris) butter takes up to six years from harvest to finished tincture, making it one of the slowest and most precious raw materials a perfumer can use.',
 14900,'assets/img/century.jpg',7)
on conflict (id) do update set
  name = excluded.name, volume = excluded.volume, notes = excluded.notes,
  fun_fact = excluded.fun_fact, price_cents = excluded.price_cents,
  image_path = excluded.image_path, sort_order = excluded.sort_order;
