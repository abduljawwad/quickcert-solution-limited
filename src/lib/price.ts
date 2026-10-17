const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatPrice(pricePence: number): string {
  return gbp.format(pricePence / 100);
}
