# Alvand

Embedded public Shopify app that says **Hello, world!** and displays a live
product total for one store or an owner-controlled multi-store workspace. It
requests only `read_products` and does not store product, customer, or order
records.

## Development

Requirements: Node.js 22.12+, Docker, PostgreSQL, and the latest Shopify CLI.

1. Copy `.env.example` to `.env` and add Shopify app credentials.
2. Run `docker compose up -d postgres`.
3. Run `npm install`, `npm run setup`, and `npm run dev`.

Useful checks are `npm test`, `npm run typecheck`, `npm run lint`,
`npm run build`, and `shopify app config validate --json`.

For the complete Lightsail, PostgreSQL, SES, and Shopify production deployment
procedure, see [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md).

Production requires `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`,
`SHOPIFY_APP_URL`, `DATABASE_URL`, `SMTP_URL`, `EMAIL_FROM`, and
`SUPPORT_EMAIL`. Use `SHOPIFY_APP_INSTALL_URL` for the public listing/install
link. Replace the starter privacy policy, terms, support address, and status
page with operator-approved production content before App Store submission.

## Product counting

The app calls `productsCount(limit: null) { count precision }` using Shopify
Admin GraphQL API `2026-10`. The null limit avoids the default 10,000 ceiling.
Counts are fetched live with bounded concurrency; failed stores are clearly
reported as a partial aggregate.

## Multi-store flow

Each store authorizes the public app separately. A Shopify user verifies an
email, creates or selects a workspace, and attaches the current installation.
Opening the app from a connected store can query the other workspace stores
through their own expiring offline tokens. A store is never silently moved
between workspaces.

## Launch checklist

- Use separate development and production Shopify app records.
- Run migrations before starting the production container.
- Test linking, isolation, scope changes, uninstall, and redaction with two
  development stores.
- Configure HTTPS, database backups, monitoring, and secret storage.
- Revisit the pinned Shopify API version every quarter.

## Architecture decision record

The original distribution decision follows.

# Shopify App Distribution and Multi-Store Architecture

## Decision

Build one **public Shopify app** with a shared backend that supports customers with one or multiple stores. Use an application-level workspace to group stores and control user access.

Single-store and multi-store customers use the same app and codebase. Each Shopify store installs and authorizes the app separately.

## Why Public Distribution

| Distribution method | Supported audience                                                            | Fit for this product                                            |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Public              | Multiple independent merchants, including merchants operating multiple stores | Recommended                                                     |
| Custom              | One store, or multiple stores belonging to the same Shopify Plus organization | Suitable for a specific client, but limits broader distribution |

Customers do not need Shopify Plus merely to connect several separately authorized stores to a public app. Plus restrictions apply to multi-store installation through custom distribution.

Shopify states that the distribution method cannot be changed after selection. Choose public distribution for the production app intended for multiple customers.

## Recommended Application Model

Use the following model in the backend. These are application entities, separate from Shopify's organization model.

| Entity           | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| Workspace        | Represents a customer business or client account                        |
| Store connection | Records a Shopify store's installation, granted scopes, and credentials |
| User             | Represents a person using the app                                       |
| Membership       | Defines a user's access to a workspace and its stores                   |

| Customer                          | Workspace arrangement      | Connected stores              |
| --------------------------------- | -------------------------- | ----------------------------- |
| Single-store owner                | One workspace              | One store                     |
| Business with multiple stores     | One workspace              | Several stores                |
| Agency managing different clients | Separate client workspaces | One or more stores per client |

Store credentials and data remain scoped to the relevant store and workspace. A combined view aggregates only stores the user is authorized to access.

## Installation and Authorization

1. The merchant installs the app on their first store and grants the requested permissions.
2. The backend records that store's installation and access credentials.
3. The merchant creates or joins a workspace through a verified account flow.
4. To connect another store, the merchant installs and authorizes the same app on that store.
5. The backend links the additional store to the workspace only after verifying permission to make that connection.

Installing the app on one store does not grant access to the owner's other stores. Each store requires its own authorization and store-specific access token.

As an implementation recommendation, handle token expiration and refresh, scope changes, and uninstallation independently for each store. Uninstalling from one store should revoke that connection without disabling other connected stores.

## User Experience

- Provide a store selector for customers with several connected stores.
- Offer an **All stores** view when combined reporting or management is useful.
- Apply workspace and store permissions to every request, including combined views.

Multi-store functionality is implemented in the application; public distribution makes the same app available to the intended customers.

## Development and Launch Path

1. Create the app under a Shopify Partner organization using the Dev Dashboard.
2. Choose **Public distribution**.
3. Use Shopify CLI to scaffold the app when building an embedded Shopify admin experience.
4. Test with multiple development stores, including store linking and access isolation.
5. Submit the app for Shopify review.
6. Choose a fully visible App Store listing for discovery, or limited visibility for initial distribution through direct listing links. Both require Shopify review.

## Official References

Verified on October 9, 2026. Recheck Shopify's current documentation before selecting distribution or submitting the app.

- [Select a distribution method](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method)
- [Building and monetizing apps with Shopify's APIs](https://help.shopify.com/en/partners/build-integrate/making-apps)
- [About apps and listing visibility](https://help.shopify.com/en/manual/apps/about-apps)
- [About app authentication](https://shopify.dev/docs/apps/build/authentication-authorization)
- [Access tokens](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens)
