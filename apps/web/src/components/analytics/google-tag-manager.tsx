import Script from 'next/script';
import { validateGoogleTagManagerId } from '@/lib/analytics';

function containerId(): string | undefined {
  return validateGoogleTagManagerId(process.env.NEXT_PUBLIC_GTM_ID);
}

export function GoogleTagManager() {
  const id = containerId();
  if (!id) return null;

  return (
    // The public App Router layout is the root layout for these routes.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="google-tag-manager" strategy="beforeInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
    </Script>
  );
}

export function GoogleTagManagerNoScript() {
  const id = containerId();
  if (!id) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${id}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
