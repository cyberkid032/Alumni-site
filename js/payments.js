// Shared helper for launching a Flutterwave checkout from any page.
// Requires the Flutterwave inline script (checkout.flutterwave.com/v3.js) and
// js/payment-config.js to be loaded on the page first.

function generateTxRef(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function launchFlutterwave({ amount, currency, email, name, title, txRef, onSuccess, onClose }) {
  if (typeof FlutterwaveCheckout !== "function") {
    alert("Payment system didn't load. Check your internet connection and try again.");
    return;
  }
  if (FLUTTERWAVE_PUBLIC_KEY === "YOUR_FLUTTERWAVE_PUBLIC_KEY") {
    alert("Payments aren't configured yet — the site admin needs to add a Flutterwave public key.");
    return;
  }

  FlutterwaveCheckout({
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: txRef,
    amount: amount,
    currency: currency || "KES",
    payment_options: "card, mobilemoneykenya, ussd",
    customer: { email, name },
    customizations: {
      title: "Kyuso Boys High School Alumni Association",
      description: title
    },
    callback: function (data) {
      if (data.status === "successful" || data.status === "completed") {
        onSuccess(data);
      } else if (onClose) {
        onClose();
      }
    },
    onclose: function () {
      if (onClose) onClose();
    }
  });
}
