# Shopify App Store review readiness

Reviewed against Shopify's mandatory App Store requirements on October 9,
2026. Re-run this audit immediately before submission because the requirements
can change.

## Likely passing from source review

- Public-distribution architecture with an embedded App Bridge application.
- Admin GraphQL API usage pinned to `2026-10`; no deprecated REST product API.
- Minimum scope is `read_products`; the app doesn't request protected customer,
  order, or storefront data.
- The install surface doesn't ask merchants to enter a shop domain manually.
- Online sessions protect embedded requests, while offline credentials remain
  server-side for connected-store counts.
- Mandatory compliance and uninstall webhook routes use Shopify's authenticated
  webhook handler and idempotent database operations.
- Product totals use `productsCount(limit: null)` and reject non-exact precision.
- A 1200-by-1200 PNG app icon is present at `public/app-icon.png`.
- Public privacy, terms, support, status, and health routes exist.

## Likely failing if submitted without production configuration

- `shopify.app.toml` has no production `client_id` until the repository is
  linked to the production Shopify app.
- The privacy policy and terms are starter copy and still require the legal
  operator name, contact details, jurisdiction, and counsel approval.
- A production support address and App Store listing URL must be supplied.
- The listing content, screenshots, demo credentials or review instructions,
  pricing declaration, and limited-visibility setting still need to be entered
  in Shopify's Dev Dashboard.

## Needs merchant-environment review

- Run the complete onboarding, ID-token, token-refresh, reinstall, scope-loss,
  and uninstall flows in Shopify Admin with two development stores.
- Confirm account isolation using a second Shopify user and email identity.
- Exercise valid, invalid, and duplicate webhook deliveries against the
  deployed HTTPS URL.
- Verify responsive embedded UI states for zero products, more than 10,000
  products, partial failures, and disconnected stores.
- Run Shopify's automated checks and validate the linked production app config.
- Build and health-check the Docker image in an environment with Docker.

Official checklist:
<https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements>
