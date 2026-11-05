/** Sends the browser to the payment page (Mercado Pago or the store's demo page). */
export function goToPayment(url: string): void {
  window.location.assign(url);
}
