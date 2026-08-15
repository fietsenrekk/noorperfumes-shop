/* NOOR PERFUMES — catalogue data
   Shopify note: this file is the stand-in for the product database.
   When porting to a custom Shopify theme, CURATED maps 1:1 to real
   products (photo -> product.featured_image, notes/fact -> metafields)
   and makeProducts() disappears in favour of a {% for product in ... %} loop. */

(function (global) {
  "use strict";

  var CURATED = [
    {
      id: "memorable", name: "Memorable", ml: "30ml", price: 128,
      notes: "Red saffron, ambergris, praline",
      photo: "assets/img/memorable.png",
      fact: "Ambergris is one of the rarest materials in perfumery — historically worth more than gold by weight. Here it anchors the praline sweetness so the scent lingers for hours."
    },
    {
      id: "citradelic", name: "Citradelic", ml: "30ml", price: 112,
      notes: "Bergamot, mint, blue iris",
      photo: "assets/img/citradelic.png",
      fact: "Nearly all of the world's bergamot grows on one narrow strip of Calabrian coastline in Italy — the reason citrus openings like this feel instantly Mediterranean."
    },
    {
      id: "velvet-sugar-rush", name: "Velvet Sugar Rush", ml: "30ml", price: 118,
      notes: "Caramel, raspberry, musk",
      photo: "assets/img/velvet-sugar-rush.png",
      fact: "Gourmand scents play with the brain's appetite centres — sweet notes are perceived as warmer and closer on skin than on paper, so this one is made to be worn, not sniffed."
    },
    {
      id: "amber-lait", name: "Amber Lait", ml: "30ml", price: 122,
      notes: "Amber, creamy wood, vanilla",
      photo: "assets/img/amber-lait.png",
      fact: "“Amber” is not a single ingredient but an accord — traditionally labdanum, benzoin and vanilla — invented by perfumers to capture the warmth of fossilised resin."
    },
    {
      id: "oud-mirage", name: "Oud Mirage", ml: "30ml", price: 135,
      notes: "Oud, saffron, smoked honey",
      photo: "assets/img/oud-mirage.png",
      fact: "Oud forms when Aquilaria trees defend themselves against a fungus. Only a small fraction of wild trees ever produce it — which is why perfumers call it liquid gold."
    },
    {
      id: "luluat-al-oud", name: "Luluat Al Oud", ml: "55ml", price: 168,
      notes: "Oud, rose petal, oriental spices",
      photo: "assets/img/luluat-al-oud.png",
      fact: "“Luluat” means pearl in Arabic. Rose over oud is the signature pairing of Middle-Eastern perfumery, layered for centuries in traditional attar form."
    },
    {
      id: "century", name: "Century", ml: "100ml", price: 149,
      notes: "Black iris, leather, tobacco leaves",
      photo: "assets/img/century.png",
      fact: "Iris (orris) butter takes up to six years from harvest to finished tincture, making it one of the slowest and most precious raw materials a perfumer can use."
    }
  ];

  var NAME_FIRST = ["Noir", "Ambre", "Fleur", "Cuir", "Santal", "Velours", "Nocturne", "Aurum", "Ombre", "Soleil", "Terre", "Ivoire", "Onyx", "Argent", "Braise", "Encens", "Reverie", "Solstice", "Aube", "Ecorce"];
  var NAME_SECOND = ["Velours", "Sauvage", "d'Acier", "Royal", "Nocturne", "Noir", "Absolu", "Intense", "Extreme", "Elixir", "Essence", "Rituel", "Legende", "Mystique", "Aurore", "Cendre", "Flamme", "Ombre", "Lumiere", "Reverie"];
  var NOTES = ["Oud", "Amber", "Musk", "Vanilla", "Sandalwood", "Iris", "Vetiver", "Saffron", "Leather", "Tobacco", "Bergamot", "Cedarwood", "Incense", "Black pepper", "Jasmine", "Rose", "Patchouli", "Cinnamon", "Citrus", "Sea salt"];

  /* one fun fact per lead note, used for the generated part of the catalogue */
  var NOTE_FACTS = {
    "Oud": "Oud resin only forms when Aquilaria trees fight off a fungal infection — rarity that earned it the nickname liquid gold.",
    "Amber": "Amber in perfumery is an accord, not an ingredient: labdanum, benzoin and vanilla blended to feel like warm resin.",
    "Musk": "Modern musks are entirely lab-made and prized for how they hug the skin — they are what makes a scent feel “clean”.",
    "Vanilla": "Vanilla is the world's second most expensive spice; each orchid flower is still pollinated by hand.",
    "Sandalwood": "True Mysore sandalwood takes 30 years to mature before its heartwood is ready for distillation.",
    "Iris": "Iris (orris) butter can take six years from harvest to tincture — one of perfumery's slowest materials.",
    "Vetiver": "Vetiver oil is distilled from roots, not leaves — the deeper the roots, the smokier the scent.",
    "Saffron": "It takes about 150 crocus flowers, picked by hand at dawn, to yield a single gram of saffron.",
    "Leather": "Leather notes date back to 17th-century glove makers who perfumed hides to mask tanning smells.",
    "Tobacco": "Tobacco absolute smells nothing like smoke — it is honeyed, dried-fruit sweet and warm.",
    "Bergamot": "Nearly all bergamot for perfumery grows on one short stretch of Calabrian coast in Italy.",
    "Cedarwood": "Cedarwood was used by ancient Egyptians in both perfume and shipbuilding — prized for lasting decades.",
    "Incense": "Frankincense resin has been traded across Arabia for over 5,000 years — longer than written history.",
    "Black pepper": "Black pepper oil carries the spark of the spice without the sneeze — the piperine stays behind in distillation.",
    "Jasmine": "Jasmine must be picked before sunrise, while the blossoms still hold their scent — around 8,000 flowers per gram of absolute.",
    "Rose": "It takes roughly 10,000 hand-picked roses to produce a single 5ml vial of rose oil.",
    "Patchouli": "Patchouli leaves get better with age — vintage-aged oil turns smoother, sweeter and more chocolatey.",
    "Cinnamon": "Cinnamon bark oil is so potent that perfumers dose it in fractions of a percent.",
    "Citrus": "Citrus oils are cold-pressed from the peel, not distilled — the freshest but most fleeting notes in perfumery.",
    "Sea salt": "There is no “salt” in a salt note — it is a mineral illusion built from ambergris-like molecules."
  };

  function makeProducts(n) {
    var out = [];
    var seen = {};
    for (var i = 0; i < n; i++) {
      var f = NAME_FIRST[i % NAME_FIRST.length];
      var s = NAME_SECOND[(i * 7 + 3) % NAME_SECOND.length];
      var name = f + " " + s;
      if (seen[name]) { name = name + " No." + (i + 1); }
      seen[name] = true;

      var ml = (i % 3 === 0) ? "100ml" : "50ml";
      var price = 140 + ((i * 13) % 120);
      price = Math.round(price / 5) * 5;

      var n1 = NOTES[i % NOTES.length];
      var n2 = NOTES[(i * 3 + 1) % NOTES.length];
      var n3 = NOTES[(i * 5 + 2) % NOTES.length];
      var notes = n1 + ", " + n2 + ", " + n3;
      var initial = (f.charAt(0) + s.replace("d'", "").charAt(0)).toUpperCase();

      out.push({
        id: "g-" + i, name: name, ml: ml, price: price,
        notes: notes, initial: initial,
        fact: NOTE_FACTS[n1] || "Every NOOR perfume is blended and matured in small batches before bottling."
      });
    }
    return out;
  }

  global.NOOR_PRODUCTS = CURATED.concat(makeProducts(200 - CURATED.length));
})(window);
