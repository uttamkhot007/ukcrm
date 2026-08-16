import { Helmet } from "react-helmet-async";

const configuredSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "");

interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

/**
 * Per-route head metadata. Canonical and og:url always self-reference the
 * route so crawlers attribute the page to itself.
 */
export function PageSeo({ title, description, path, noindex }: PageSeoProps) {
  const origin = configuredSiteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${origin}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
    </Helmet>
  );
}

export default PageSeo;
