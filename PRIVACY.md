# Privacy — JWT Decoder

JWT Decoder does not collect, store, or transmit any data.

- The token you select or paste is decoded **in your browser**, inside the page or the extension popup. It is never sent to a server.
- The extension makes no network requests. The only `fetch` call loads the extension's own local stylesheet.
- Tokens are not saved to disk, to `chrome.storage`, or to any log. Closing the panel or popup discards them.
- No analytics, telemetry, advertising, or third-party services are used.
- The extension requests no permanent access to websites. The `activeTab` permission grants temporary access to the current tab only after you choose **JWT Decode** from the context menu, so the panel can be shown there.

The signature of a JWT is **not** verified. The extension only reads the token contents.

Last updated: 2026-11-16.
