import { ScrollViewStyleReset } from 'expo-router/html';

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
        <style dangerouslySetInnerHTML={{ __html: visibleScrollbar }} />
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
}`;

/**
 * Chrome hides overlay scrollbars until you scroll, so a list that is capped at a few rows gives
 * no sign there is more below it. Naming a `scrollbar-color` opts that element out of overlay
 * scrollbars, so the bar sits beside the list the whole time. Scoped by `data-scroll` — set with
 * a `dataSet` prop — rather than applied to every scrollable thing in the app. The selector is
 * doubled to outrank the `scrollbar-width: none` react-native-web injects at runtime, which a
 * single attribute ties with and loses to on source order.
 */
const visibleScrollbar = `
[data-scroll="always"][data-scroll="always"] {
  scrollbar-width: thin;
  scrollbar-color: #DCE6EF transparent;
}
[data-scroll="always"][data-scroll="always"]::-webkit-scrollbar {
  width: 8px;
}
[data-scroll="always"][data-scroll="always"]::-webkit-scrollbar-track {
  background: transparent;
}
[data-scroll="always"][data-scroll="always"]::-webkit-scrollbar-thumb {
  background-color: #DCE6EF;
  border-radius: 999px;
}`;
