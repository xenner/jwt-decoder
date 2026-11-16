# Chrome Web Store listing — English

> Ficha en español: [`CHROME-WEB-STORE-LISTING.md`](CHROME-WEB-STORE-LISTING.md).
> Publicación paso a paso: [`PUBLISHING.md`](PUBLISHING.md).

## Store listing

**Name:** JWT Decoder

**Summary (max. 132 characters):**

```text
Decode the JWT you select and inspect its payload instantly, without sending the token to any server.
```

**Category:** Developer Tools

**Language:** English

**Interface languages:** English, Spanish (Argentina / Latin America), Portuguese (Brazil)

**Privacy policy URL:** https://xenner.github.io/jwt-decoder/privacy.html

**Repository:** https://github.com/xenner/jwt-decoder

**Detailed description:**

```text
Select a JWT on any page, right-click and choose "JWT Decode". The payload opens in a panel next to your selection, without copying the token or leaving the page.

Built for debugging sessions, checking claims and understanding what a token contains before you use it: APIs, logs, documentation or the clipboard.

WHAT IT SHOWS

- Full payload as formatted JSON, with keys, strings, numbers, booleans and null values highlighted.
- Header and signature in collapsible sections.
- Readable dates for exp, nbf and iat, with relative time and an expired-token warning.
- A notice when the token is not signed (alg: none).
- JWE detection: shows the header and explains that the payload is encrypted.
- Copy buttons for the payload, header, signature or complete token.
- Light or dark theme that follows the page.

HOW TO USE

- Select the token on a page and use the context menu: JWT Decode.
- Or open the toolbar icon and paste a token into the popup.

LANGUAGES

English (default), Spanish (Argentina / Latin America) and Portuguese (Brazil). The interface follows the Chrome UI language.

PRIVACY

No data is collected. The token is decoded locally in the tab and is never sent, stored or logged. The extension makes no network requests and has no servers, analytics or telemetry. It only accesses the current tab when you choose the context menu item, using the activeTab permission.

IMPORTANT

The extension does not verify signatures; it only reads the token contents. A token can decode successfully and still be invalid, expired or forged. Encrypted JWE tokens cannot be decrypted without the key.

LIMITS

- Maximum token size: 256 KB.
- The panel cannot be injected into internal Chrome pages (chrome://) or the Chrome Web Store. The toolbar popup still works there.

Open source: https://github.com/xenner/jwt-decoder
```

## Permission justifications

- **`contextMenus`:** adds the **JWT Decode** item to the right-click menu only when text is selected. It does not access data by itself.
- **`activeTab`:** grants temporary access to the current tab only after the user chooses that menu item, so the decoded panel can be shown there. There is no permanent access to websites, and the grant ends when the tab navigates or closes.
- **`scripting`:** injects the extension's own packaged files (`jwt.js`, `ui.js`, `content.js`) into the active tab after that click.
- **`web_accessible_resources` (`src/jwd.css`):** exposes only the local stylesheet loaded by the panel inside its Shadow DOM. It is not executable code and contains no user data.
- **No `host_permissions`, global content scripts, `storage`, `tabs` or network permissions.**

## Declarations

- **Single purpose:** decode the JWT selected or pasted by the user and display its claims locally in the browser.
- **Remote code:** No. All JavaScript, styles and icons are packaged with the extension. No code is fetched or evaluated at runtime.
- **Data usage:** No user data is collected, sold or shared. The token is processed in memory and discarded when the panel or popup closes. It is never transmitted.
- **Advertising:** No.
- **Analytics and telemetry:** No.
- **Accounts:** None required.
- **Own servers:** None.
- **Signature verification:** Not performed. The listing and the interface state this clearly.

**Data usage disclosure:** select **Website content**. The extension handles only the text the user explicitly selects or pastes as a JWT. It is decoded locally and is never stored, logged, sold, shared or transmitted. No other data category applies. Check all three limited-use certifications.

## Screenshots

All are 1280×800, opaque, and use fictional data:

- `screenshots/panel-light.png` — light panel over a simulated API console.
- `screenshots/panel-dark.png` — dark panel with an expired token and a red `exp` chip.
- `screenshots/popup.png` — toolbar popup with a pasted token and decoded payload.

## Test instructions

Paste into **Test instructions**:

```text
No account, login or test site is required.

1. Install the extension.
2. Click the JWT Decoder toolbar icon.
3. Paste this sample token and click Decode:

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFjbWUtMjAyNi0xMSJ9.eyJzdWIiOiJ1c3JfOGYzYTJjIiwibmFtZSI6IkFsZXggUml2ZXJhIiwic2NvcGUiOiJvcmRlcnM6cmVhZCBvcmRlcnM6d3JpdGUiLCJpYXQiOjE3OTQ3NTMxMjAsImV4cCI6MTc5NzM0NTEyMH0.qA7mS3xR9vK2pL8nT4wY6zB1cD5fG0hJ

The payload should show sub, name, scope, iat and exp. The signature is not verified by design.

To test the context menu:
1. Open https://xenner.github.io/jwt-decoder/test/sample.html
2. Select the first token.
3. Right-click and choose "JWT Decode".
4. The decoded panel should appear next to the selection.

The sample page is bundled in the repository and uses only fictional data.
```

## Review notes

1. Load the extension unpacked or install the submitted build.
2. Open the toolbar popup and paste the sample token.
3. Check the panel, the `exp`/`iat` chips, the copy buttons and closing with `Esc`.
4. Open the sample page, select a token and test **JWT Decode** in the context menu.
5. Try an invalid token to see the error state and a JWE to see the encrypted-payload notice.

No account, server or real user data is required.
