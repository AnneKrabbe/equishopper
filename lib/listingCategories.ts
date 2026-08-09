export const listingCategories = {
  "Til hesten": {
    Hestepleje: [
      "Strigler og børster",
      "Strigletasker og -kasser",
      "Pelspleje",
      "Man- og halepleje",
      "Hovpleje",
      "Førstehjælp, sår og kløe",
      "Terapiprodukter",
      "Insekter",
    ],
    Rideudstyr: [
      "Sadler",
      "Underlag og pads",
      "Gamacher",
      "Bandager og -underlag",
      "Klokker og sko",
      "Hutter",
      "Gjorde og tilbehør",
      "Stigbøjler og stigremme",
      "Trenser, tøjler og tilbehør",
      "Bid",
      "Grimer og træktove",
      "Pleje af læder og udstyr",
      "Stævneudstyr og transport",
      "Piske",
      "Longering og træning",
      "Fluebeskyttelse",
    ],
    Dækkener: [
      "Regndækken",
      "Overgangsdækken",
      "Vinterdækken",
      "Linere",
      "Halse",
      "Stalddækken",
      "Fleece- og ulddækken",
      "Coolerdækken",
      "Lændedækken",
      "Insekt- og eksemdækken",
    ],
    "Hestefoder og tilskud": [
      "Fuldfoder",
      "Mash",
      "Tilskud, vitaminer og mineraler",
      "Godbidder",
    ],
  },

  "Til rytteren": {
    "Til rytteren": [
      "Ridehjelme",
      "Ridebukser og tights",
      "Ridestøvler",
      "T-shirts",
      "Bluser og trøjer",
      "Jakker og frakker",
      "Veste",
      "Stævnetøj",
      "Strømper",
      "Handsker",
      "Huer og pandebånd",
      "Accessories",
    ],
  },

  "Til stalden": {
    "Til stalden": [
      "Baljer",
      "Hegnstilbehør",
      "Hønet og slowfeedere",
      "Krybber og sliksten",
      "Legetøj",
      "Opbinding",
      "Redskaber",
      "Strøelse",
      "Staldinventar",
    ],
  },
} as const;

export type MainCategory = keyof typeof listingCategories;

export function getCategoryGroups(mainCategory: string): string[] {
  if (mainCategory !== "Til hesten") {
    return [];
  }

  return Object.keys(listingCategories["Til hesten"]);
}

export function getSubcategories(
  mainCategory: string,
  groupName = ""
): string[] {
  if (mainCategory === "Til hesten") {
    if (!groupName) {
      return [];
    }

    const group =
      listingCategories["Til hesten"][
        groupName as keyof (typeof listingCategories)["Til hesten"]
      ];

    return group ? [...group] : [];
  }

  if (mainCategory === "Til rytteren") {
    return [...listingCategories["Til rytteren"]["Til rytteren"]];
  }

  if (mainCategory === "Til stalden") {
    return [...listingCategories["Til stalden"]["Til stalden"]];
  }

  return [];
}

export function getAllSubcategories(mainCategory: string): string[] {
  if (mainCategory === "Til hesten") {
    return Object.values(listingCategories["Til hesten"]).reduce<string[]>(
      (all, group) => [...all, ...group],
      []
    );
  }

  return getSubcategories(mainCategory);
}