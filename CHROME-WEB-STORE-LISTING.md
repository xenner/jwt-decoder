# Chrome Web Store — ficha de publicación

> Versión en inglés: [`CHROME-WEB-STORE-LISTING-EN.md`](CHROME-WEB-STORE-LISTING-EN.md).
> Guía de publicación paso a paso: [`PUBLISHING.md`](PUBLISHING.md).

## Ficha

- **Nombre:** JWT Decoder
- **Resumen (máx. 132 caracteres):** Decodifica el JWT que seleccionas y muestra su payload al instante, sin enviar el token a ningún servidor.
- **Categoría:** Herramientas para desarrolladores (`Developer Tools`)
- **Idioma predeterminado:** Inglés
- **Idiomas de la interfaz:** inglés, español de Argentina, español de Latinoamérica y portugués de Brasil
- **Página de privacidad:** https://xenner.github.io/jwt-decoder/privacy.html
- **Repositorio:** https://github.com/xenner/jwt-decoder

## Descripción

```text
Selecciona un JWT en cualquier página, haz clic derecho y elige "JWT Decode". El payload se abre en un panel junto a la selección, sin copiar el token ni salir de la página.

Pensada para depurar sesiones, revisar claims y entender qué contiene un token antes de usarlo: APIs, logs, documentación o el portapapeles.

QUÉ MUESTRA

- Payload completo con formato JSON y resaltado de claves, strings, números y valores nulos.
- Encabezado y firma en secciones plegables.
- Fechas legibles para exp, nbf e iat, con tiempo relativo y aviso de token vencido.
- Aviso si el token no está firmado (alg: none).
- Detección de JWE: muestra el encabezado y aclara que el payload está cifrado.
- Botones para copiar payload, encabezado, firma o token completo.
- Tema claro u oscuro según la página.

CÓMO SE USA

- Selecciona el token en una página y usa el menú contextual: JWT Decode / Decodificar JWT.
- O abre el icono de la extensión y pega un token en el popup.

IDIOMAS

Inglés (predeterminado), español de Argentina/Latinoamérica y portugués de Brasil. La interfaz sigue el idioma de Chrome.

PRIVACIDAD

No se recopilan datos. El token se decodifica localmente en la pestaña y nunca se envía, guarda ni registra. La extensión no hace peticiones de red y no tiene servidores ni analíticas. Solo accede a la pestaña cuando elegís el menú contextual, mediante el permiso activeTab.

IMPORTANTE

La extensión no verifica la firma: solo lee el contenido. Un token puede decodificarse correctamente y aun así ser inválido, estar vencido o haber sido falsificado. Los tokens JWE cifrados no se pueden descifrar sin la clave.

LÍMITES

- Token máximo: 256 KB.
- No se puede inyectar el panel en páginas internas de Chrome (chrome://) ni en la Chrome Web Store. En esos casos se puede usar el popup.

Código abierto: https://github.com/xenner/jwt-decoder
```

## Justificación de permisos

- **`contextMenus`:** agrega el ítem **JWT Decode** al menú contextual únicamente cuando hay texto seleccionado. No accede a datos por sí solo.
- **`activeTab`:** concede acceso temporario a la pestaña actual solo después de que el usuario elige el ítem del menú, para poder mostrar el panel ahí. No hay acceso permanente a los sitios y el permiso se pierde al navegar o cerrar la pestaña.
- **`scripting`:** inyecta los archivos propios de la extensión (`jwt.js`, `ui.js`, `content.js`) en la pestaña activa después de ese clic.
- **`web_accessible_resources` (`src/jwd.css`):** solo expone la hoja de estilos local que el panel carga dentro de su Shadow DOM. No es código ejecutable ni contiene datos.
- **Sin `host_permissions`, `content_scripts` globales, `storage`, `tabs` ni permisos de red.**

## Declaraciones

- **Propósito único:** decodificar el JWT que el usuario selecciona o pega y mostrar sus claims localmente en el navegador.
- **Código remoto:** no. Todo el JavaScript, los estilos y los iconos están empaquetados. No se descarga ni evalúa código en tiempo de ejecución.
- **Datos del usuario:** no se recopilan, venden ni comparten. El token se procesa en memoria y se descarta al cerrar el panel o el popup. Nunca se transmite.
- **Publicidad:** no.
- **Analíticas y telemetría:** no.
- **Cuentas:** no requiere cuenta ni inicio de sesión.
- **Servidores propios:** no tiene.
- **Firma:** no se verifica. La ficha y la interfaz lo aclaran.

Si el cuestionario de privacidad obliga a declarar una categoría de datos, la opción más honesta es **Website content** (el texto que el usuario selecciona), usada solo localmente para mostrar el resultado y nunca transmitida.

## Capturas

Todas son de 1280×800, sin transparencia, y usan datos ficticios:

- `screenshots/panel-light.png` — panel claro sobre una consola de API simulada.
- `screenshots/panel-dark.png` — panel oscuro con un token vencido y el chip `exp` en rojo.
- `screenshots/popup.png` — popup del icono con un token pegado y decodificado.

## Instrucciones para el revisor

Pegar en **Test instructions**:

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

## Notas para la revisión

1. Cargar la extensión descomprimida o instalar la versión enviada.
2. Abrir el popup del icono y pegar el token de ejemplo.
3. Verificar el panel, los chips de `exp`/`iat`, el copiado y el cierre con `Esc`.
4. Abrir la página de ejemplo, seleccionar un token y probar **JWT Decode** en el menú contextual.
5. Probar un token inválido para ver el mensaje de error y un JWE para ver el aviso de payload cifrado.

No se requiere ninguna cuenta, servidor ni acceso a datos reales.
