import { Helmet } from "react-helmet-async";

/**
 * Marks private / authenticated application surfaces as non-indexable.
 * Renders no visible output — metadata only.
 */
export default function NoIndex({ title }: { title?: string }) {
  return (
    <Helmet>
      {title ? <title>{title}</title> : null}
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Helmet>
  );
}
