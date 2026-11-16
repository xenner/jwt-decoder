# JWT Decoder

Extensión de Chrome (Manifest V3) que decodifica un **JWT** seleccionado en cualquier página desde el menú contextual y muestra su **payload** en un panel flotante, sin enviar el token a ningún servidor.

La interfaz está en **inglés por defecto** y se localiza automáticamente a **español de Argentina**, **español de Latinoamérica** y **portugués de Brasil** según el idioma de Chrome.

## Qué hace

- Agrega **JWT Decode** (o **Decodificar JWT**) al menú contextual cuando hay texto seleccionado.
- Extrae el token aunque la selección incluya `Bearer`, comillas o texto alrededor.
- Muestra el **payload** con formato JSON y colores, el **encabezado** y la **firma** en secciones plegables.
- Resume los claims de tiempo `exp`, `nbf` e `iat` con fecha local y tiempo relativo, y marca los tokens vencidos.
- Avisa cuando el token no está firmado (`alg: none`).
- Detecta tokens cifrados (**JWE**) y muestra solo el encabezado, porque el payload está cifrado.
- Permite copiar el payload, el encabezado, la firma o el token completo.
- El panel vive en un **Shadow DOM**: los estilos de la página no lo afectan y él no altera la página.
- Sigue el tema claro/oscuro de la página.
- Incluye un popup en el icono de la extensión para pegar y decodificar un token sin seleccionar nada.
- Todo el análisis ocurre en el navegador. No hay servidores, analíticas ni pedidos de red.

> **La firma no se verifica.** La extensión solo lee el token, por lo que un token puede ser válido sintácticamente y aun así haber sido falsificado. Para validar la firma hace falta la clave o el JWKS del emisor.

## Instalar en modo desarrollador

1. Descarga o clona esta carpeta.
2. Abre `chrome://extensions`.
3. Activa **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y elige la carpeta que contiene `manifest.json`.
5. Abre cualquier página con un JWT, selecciona el token, haz clic derecho y elige **JWT Decode**.

No hay paso de compilación: la extensión se carga tal cual.

## Uso

| Situación | Qué ocurre |
| --- | --- |
| Token seleccionado + clic derecho | Aparece **JWT Decode** en el menú contextual. |
| Al elegirlo | El panel se abre junto a la selección con el payload decodificado. |
| `Esc` | Cierra el panel. |
| Clic fuera del panel | Cierra el panel. |
| Icono de la extensión | Abre un popup para pegar un token y decodificarlo. |
| `Ctrl/Cmd + Enter` en el popup | Decodifica el token pegado. |

También funciona si seleccionas una línea completa como `Authorization: Bearer eyJ...`: la extensión busca el token dentro del texto.

### Página de prueba

`test/sample.html` incluye tokens válidos, vencidos, sin firma, cifrados y texto que no es un JWT:

```bash
cd jwt-decoder
python3 -m http.server 8765
# abre http://127.0.0.1:8765/test/sample.html
```

Con la extensión cargada, selecciona cada token y prueba el menú contextual.

## Qué muestra el panel

- **Payload**: JSON completo, con claves, strings, números, booleanos y `null` resaltados.
- **Encabezado**: algoritmo (`alg`), tipo (`typ`) y el resto del header.
- **Firma**: el segmento de firma tal cual, con la aclaración de que no se verifica. Si el token no tiene firma, lo indica.
- **Claims de tiempo**: `exp`, `nbf` e `iat` con la fecha en tu zona horaria y el tiempo relativo; `exp` vencido se muestra en rojo.
- **Avisos**: `alg: none`, JWE cifrado o errores de formato con una explicación.

## Permisos

| Permiso | Para qué se usa |
| --- | --- |
| `contextMenus` | Agregar **JWT Decode** al menú contextual. |
| `activeTab` | Acceso temporario a la pestaña **solo** cuando usas el menú contextual, para inyectar el panel. No hay acceso permanente a los sitios. |
| `scripting` | Inyectar los archivos del panel en la pestaña activa. |

No se declara `host_permissions` ni `content_scripts` sobre todos los sitios: la extensión no tiene acceso a las páginas hasta que el usuario elige el menú contextual. Tampoco usa `storage`, `tabs` ni permisos de red.

En páginas restringidas (`chrome://`, Chrome Web Store, algunas páginas internas del navegador) Chrome no permite inyectar el panel. En ese caso el icono muestra un aviso `!` y se puede usar el popup para pegar el token.

## Cómo funciona

1. El **service worker** crea el ítem **JWT Decode** del menú contextual al instalar o iniciar el navegador.
2. Al hacer clic, Chrome concede `activeTab` para esa pestaña. El service worker inyecta `src/jwt.js`, `src/ui.js` y `src/content.js` en el frame donde estaba la selección.
3. El **content script** decodifica el token: Base64URL → bytes → UTF-8 → `JSON.parse`.
4. Construye el panel, lo monta en un Shadow DOM y lo posiciona junto a la selección (o centrado si no hay rectángulo de selección).
5. Los botones de copia usan `navigator.clipboard` y, si no está disponible, un `textarea` temporal.
6. No se hace ninguna petición de red: el único `fetch` es el del CSS local de la extensión.

## Límites conocidos

- **No verifica firmas** ni valida `iss`, `aud` o la cadena de confianza.
- Solo decodifica tokens **JWS** (3 segmentos) y muestra el encabezado de los **JWE** (5 segmentos). Un JWE no se puede descifrar sin la clave.
- Tamaño máximo del token: **256 KB**.
- Si la selección contiene varios tokens, se usa el primero que coincida.
- En iframes de otro origen, si `activeTab` no alcanza, el panel se muestra en el frame principal.
- No funciona en `chrome://`, la Chrome Web Store ni el visor PDF interno.
- No interpreta ni repara tokens truncados.

## Desarrollo

No hay bundler ni dependencias de ejecución. Para correr las pruebas del decodificador:

```bash
cd jwt-decoder
node --test test/jwt.test.mjs
```

### Estructura

```
manifest.json              Manifest V3
src/
  background.js            menú contextual, activeTab e inyección
  jwt.js                   decodificación Base64URL/UTF-8/JSON y utilidades
  ui.js                    construcción del panel (payload, header, firma)
  content.js               panel flotante en Shadow DOM y posicionamiento
  jwd.css                  estilos compartidos del panel y del popup
  popup.html / popup.js    popup del icono para pegar un token
  popup.css                estilos propios del popup
  i18n.js                  helper de internacionalización del popup
_locales/                  mensajes en, es, es_419 y pt_BR
icons/                     iconos 16/32/48/128, 512 y SVG fuente
test/
  sample.html              página con tokens de ejemplo
  jwt.test.mjs             pruebas del decodificador con node:test
```

### Empaquetar para la Chrome Web Store

```bash
cd jwt-decoder
zip -r ../jwt-decoder-1.0.0.zip \
  manifest.json src icons _locales README.md PRIVACY.md LICENSE
```

También puedes usar `chrome://extensions` → **Empaquetar extensión**.

## Privacidad

La extensión no recolecta datos, no usa analíticas y no envía nada fuera del navegador. El token se decodifica en la pestaña y nunca se guarda en disco ni se transmite. Consulta [PRIVACY.md](PRIVACY.md).

## Licencia

MIT. Consulta [LICENSE](LICENSE).
