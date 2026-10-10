import { PublicPage } from "../components/PublicPage";

export const meta = () => [{ title: "Privacy | Hello Product Count" }];

export default function Privacy() {
  return (
    <PublicPage title="Privacy policy">
      <p>
        Hello Product Count stores the merchant email used to verify an app
        account, Shopify store identifiers, workspace membership, installation
        state, and authentication sessions needed to provide the service.
      </p>
      <p>
        The app reads product totals from Shopify on demand. It does not retain
        product, customer, or order records. Account owners can delete their app
        account from the Manage stores page. Shopify privacy webhooks are
        authenticated and honored as required.
      </p>
      <p>
        Contact the support address shown on the support page for access,
        correction, deletion, or privacy questions. Replace this project policy
        with counsel-approved operator details before App Store submission.
      </p>
    </PublicPage>
  );
}
