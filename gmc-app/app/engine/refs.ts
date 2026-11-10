// Google Merchant Center help pages each check is mapped to (all read 2026-11-09).
// If Google moves a page, change it here once.
export const REF = {
  editorial: "https://support.google.com/merchants/answer/17233876",
  websiteFix: "https://support.google.com/merchants/answer/12056511",
  trust: "https://support.google.com/merchants/answer/13693865",
  misrepresentation: "https://support.google.com/merchants/answer/17234184",
  businessInfo: "https://support.google.com/merchants/answer/14286818",
  businessName: "https://support.google.com/merchants/answer/12159159",
  priceMismatch: "https://support.google.com/merchants/answer/6098334",
  structuredData: "https://support.google.com/merchants/answer/6069143",
  requestReview: "https://support.google.com/merchants/answer/13585221",
} as const;

// Where to fix things in Shopify admin.
export const FIX = {
  policies: "Shopify admin → Settings → Policies",
  refund: "Shopify admin → Settings → Policies → Return and refund policy",
  shipping: "Shopify admin → Settings → Policies → Shipping policy",
  pages: "Shopify admin → Online Store → Pages",
  navigation: "Shopify admin → Content → Menus (footer menu)",
  theme: "Shopify admin → Online Store → Themes → Customize",
  storeDetails: "Shopify admin → Settings → Store details",
  products: "Shopify admin → Products",
  preferences: "Shopify admin → Online Store → Preferences (password protection)",
  gmcBusinessInfo: "Merchant Center → Settings → Business info",
} as const;
