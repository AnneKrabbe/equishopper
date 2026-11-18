/** Alle prisbeløb her er øre, og rå fragtpriser indeholder moms. */
export const SHIPPING_DISCOUNT_OERE = 1000;
export function calculateShippingOere(priceAmount: number): number {
  if (!Number.isFinite(priceAmount) || priceAmount < 0) return 0;
  return Math.max(0, Math.ceil(priceAmount / 100) * 100 - SHIPPING_DISCOUNT_OERE);
}
export function calculateBuyerProtectionOere(subtotalOere: number): number {
  if (!Number.isFinite(subtotalOere) || subtotalOere < 0) return 0;
  return Math.round(subtotalOere * 0.03) + 1000;
}
