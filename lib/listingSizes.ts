export const sizeTypeBySubcategory: Record<string, string> = {
  "Grimer og træktove": "grime",
  Gamacher: "gamacher",
  "Underlag og pads": "underlag",
  Ridehjelme: "ridehjelm",

  Regndækken: "dækken",
  Overgangsdækken: "dækken",
  Vinterdækken: "dækken",
  Stalddækken: "dækken",
  "Fleece- og ulddækken": "dækken",
  Coolerdækken: "dækken",
  Lændedækken: "dækken",
  "Insekt- og eksemdækken": "dækken",

  Linere: "liner",
  Halse: "hals",
  "Gjorde og tilbehør": "gjord",
  Bid: "bid",
  "Ridebukser og tights": "ridebukser",
  Sadler: "sadel",

  "Bluser og trøjer": "dametøj",
  "Jakker og frakker": "dametøj",
  "T-shirts": "dametøj",
  Veste: "dametøj",
  "Stævnejakker": "dametøj",

  Ridestøvler: "ridestøvler",
  Handsker: "handsker",
  Strømper: "strømper",
  Hutter: "hutter",
  "Bandager og -underlag": "bandager",
  "Klokker og sko": "klokker",
  "Trenser, tøjler og tilbehør": "trense",
  Piske: "pisk",
};

export function getSizeTypeForSubcategory(
  subcategory: string
): string | null {
  return sizeTypeBySubcategory[subcategory] ?? null;
}