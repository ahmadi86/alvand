import { PublicPage } from "../components/PublicPage";

export const meta = () => [{ title: "Terms | Hello Product Count" }];

export default function Terms() {
  return (
    <PublicPage title="Terms of service">
      <p>
        Hello Product Count is a free informational service that displays live
        totals returned by Shopify. The service is provided without guarantees
        of uninterrupted availability, and merchants remain responsible for
        decisions based on store data.
      </p>
      <p>
        Users must have authority to connect each store and must not share
        verification links. Replace these starter terms with counsel-approved
        operator, jurisdiction, warranty, and liability terms before App Store
        submission.
      </p>
    </PublicPage>
  );
}
