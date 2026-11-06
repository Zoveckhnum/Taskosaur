import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/iqualitys-favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/brand/iqualitys-favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/brand/iqualitys-favicon-180.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
