export const PRODUCTS = [
  // BOX product
  {
    id: 99901,
    shop: "shop2",
    isNew: true,
    title: "BOX SPECIAL DEGUSTATION",
    subtitle: "Compose ta box",
    badge: "Box personnalisable",
    rating: 5.0,
    tags: ["Custom"],
    poster: "https://picsum.photos/seed/boxposter/900/700",
    video: "", // empty like your reference
    tiers: [{ label: "1BOX", price: 200, unitText: "/ 1BOX" }],
    desc: "Profil : Box personnalisable. Arômes : Custom. Origine : Compose ta box.",
    isBox: true,
    boxPicks: [
      { label: "Choix 1 – 1g", options: [{ id: "217", text: "Piatella — Piatella" }] },
      { label: "Choix 2 – 5g", options: [{ id: "200", text: "Black Cherry — DrySift 190/45U By East Cost Mountains" }, { id: "201", text: "Biscotti — DrySift 190/45U By East Cost Mountains" }] },
      { label: "Choix 3 – 5g", options: [{ id: "202", text: "Hulkberry — DrySift 160/73U By Squadra Farm" }, { id: "203", text: "Banana X Cream — DrySift 160/73U By Squadra Farm" }] },
    ],
  },

  // Normal product with tiers + video
  {
    id: 3001,
    shop: "shop3",
    isNew: true,
    title: "Static Drugs",
    subtitle: "Premium Static",
    badge: "Indica 70%",
    rating: 4.8,
    tags: ["Baie", "Epicé"],
    poster: "https://picsum.photos/seed/staticposter/900/700",
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", // placeholder video
    tiers: [
      { label: "100G", price: 500, unitText: "/ 100G · ~5.00 €/g" },
      { label: "50G", price: 270, unitText: "/ 50G · ~5.40 €/g" },
      { label: "25G", price: 150, unitText: "/ 25G · ~6.00 €/g" },
    ],
    desc: "Profil : Indica 70%. Arômes : Baie, Epicé. Origine : Premium Static.",
    isBox: false,
  },
];
