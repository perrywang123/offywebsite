/* Served/injected only by the loopback integration simulator, never by production. */
(() => {
  const choice = new URL(location.href).searchParams.get("__test_consent");
  if (choice === "allow" || choice === "deny") localStorage.setItem("offy_test_consent", choice);
  const allowed = localStorage.getItem("offy_test_consent") === "allow";
  window.Shopify = {
    ...window.Shopify,
    customerPrivacy: {
      consentStatus: "loaded",
      analyticsProcessingAllowed: () => allowed,
      marketingAllowed: () => allowed,
      saleOfDataAllowed: () => allowed,
    },
  };
  document.dispatchEvent(new Event("shopifyCustomerPrivacyApiLoaded"));
})();
