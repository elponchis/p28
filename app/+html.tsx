import { ScrollViewStyleReset } from 'expo-router/html';
import { colors } from '@/theme/tokens';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>P28</title>
        <meta property="og:title" content="P28" />
        <meta property="og:description" content="여기를 눌러 링크를 확인하세요." />
        <meta property="og:type" content="website" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}

/* This app is designed for phone-width screens. Past a tablet/desktop breakpoint,
   cap the app to a phone-like column instead of stretching the layout full-bleed
   (which otherwise blows out spacing between elements designed for ~400px wide). */
@media (min-width: 640px) {
  body {
    background-color: ${colors.surfaceContainerHigh};
  }
  #root {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.08);
  }
}`;
