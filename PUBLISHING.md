# Publicar JWT Decoder en Chrome Web Store

Guía para publicar la versión **1.0.0**, gratis y visible para todos.

## Antes de empezar

Necesitás:

- Cuenta de Google para el [developer dashboard](https://chrome.google.com/webstore/devconsole).
- **USD 5** por única vez para registrar el publisher.
- Verificación de email y **2FA** activo en la cuenta.
- El ZIP de la extensión.
- La ficha en inglés: [`CHROME-WEB-STORE-LISTING-EN.md`](CHROME-WEB-STORE-LISTING-EN.md).
- Las capturas de 1280×800 de [`screenshots/`](screenshots/).
- La política de privacidad pública: https://xenner.github.io/jwt-decoder/privacy.html.

## 1. Empaquetar

No hay build. El ZIP contiene el manifest y los archivos de ejecución:

```bash
cd jwt-decoder
mkdir -p dist
rm -f dist/jwt-decoder-1.0.0.zip
python3 -m zipfile -c dist/jwt-decoder-1.0.0.zip \
  manifest.json src icons _locales README.md PRIVACY.md LICENSE privacy.html
```

Si tenés `zip` instalado, el comando equivalente es:

```bash
zip -r dist/jwt-decoder-1.0.0.zip \
  manifest.json src icons _locales README.md PRIVACY.md LICENSE privacy.html
```

Verificá que `manifest.json` esté en la raíz del ZIP (no dentro de una carpeta) y que la versión coincida con la ficha.

## 2. Crear el item

1. Entrá a https://chrome.google.com/webstore/devconsole.
2. Pulsá **Add new item**.
3. Subí `dist/jwt-decoder-1.0.0.zip`.
4. Revisá que el dashboard acepte el manifest.

### Límite de 2 extensiones por cuenta

Las cuentas nuevas de publisher tienen un límite inicial de **2 extensiones publicadas**. No es un problema del ZIP ni del manifest: es una medida antispam de Chrome Web Store.

Si el dashboard muestra el límite:

1. Usá la opción del dashboard para **solicitar un aumento** (`Request increase`) al intentar agregar el ítem.
2. En la mayoría de los casos la decisión es inmediata; si te piden abrir un caso de soporte, puede tardar unos días.
3. Se evalúan la antigüedad y actividad de la cuenta y el engagement sostenido de las extensiones ya publicadas.
4. El límite no aplica a temas.

Si la solicitud se rechaza, las razones habituales son que las extensiones publicadas todavía necesitan más engagement o que la cuenta es demasiado nueva. Mantené las extensiones existentes, esperá un tiempo y volvé a solicitar.

No crees cuentas duplicadas para evadir el límite: va contra las políticas de Chrome Web Store y puede provocar la suspensión de todas las cuentas.

Referencia oficial: https://developer.chrome.com/docs/webstore/publish#item_limits

## 3. Store listing

Usá los textos de `CHROME-WEB-STORE-LISTING-EN.md`.

| Campo | Valor |
|---|---|
| Name | `JWT Decoder` |
| Summary | `Decode the JWT you select and inspect its payload instantly, without sending the token to any server.` |
| Category | `Developer Tools` |
| Language | `English` |
| Description | La descripción completa del archivo en inglés |
| Screenshots | `screenshots/panel-light.png`, `panel-dark.png`, `popup.png` |
| Icon | Viene en el ZIP |
| Privacy policy | `https://xenner.github.io/jwt-decoder/privacy.html` |
| Support URL | `https://github.com/xenner/jwt-decoder/issues` |

La interfaz está en inglés, español y portugués; el idioma predeterminado de la ficha es inglés.

## 4. Privacy practices

En la pestaña **Privacy**:

- **Single purpose:** `Decode the JWT selected or pasted by the user and display its claims locally in the browser.`
- **Remote code:** No.
- **`contextMenus`:** ítem **JWT Decode** cuando hay texto seleccionado.
- **`activeTab`:** acceso temporario a la pestaña solo después de elegir el menú contextual, para mostrar el panel.
- **`scripting`:** inyectar los archivos propios de la extensión en la pestaña activa.
- **Datos:** no se recopilan, venden ni comparten. El token se procesa localmente y no se transmite. En la sección de uso de datos, marcá **Website content**: es el único contenido que la extensión maneja (el texto que el usuario selecciona o pega), y lo hace localmente.
- **Certificaciones:** marcá las tres de uso limitado (no vender/transferir datos, no usarlos para fines ajenos al propósito y no usarlos para evaluar crédito).
- **Signature verification:** la extensión no verifica firmas; lo aclara en la ficha y en la interfaz.
- **Privacy policy URL:** `https://xenner.github.io/jwt-decoder/privacy.html`.

## 5. Test instructions

Pegá el bloque de `CHROME-WEB-STORE-LISTING-EN.md` (sección **Test instructions**). Incluye:

- Token de ejemplo para pegar en el popup.
- Página pública de prueba: https://xenner.github.io/jwt-decoder/test/sample.html
- Pasos para probar el menú contextual.

No hace falta cuenta, login ni sitio de prueba.

## 6. Distribución

1. **Visibility:** `Public`.
2. **Regions:** todos.
3. **Pricing:** gratis.

## 7. Enviar a revisión

1. Pulsá **Submit for Review**.
2. Podés dejar la publicación automática o usar **Defer publish**.
3. Revisá el email de la cuenta.
4. La revisión puede tardar horas o varios días.

## 8. Después de la aprobación

1. Copiá la URL de la ficha (`https://chromewebstore.google.com/detail/...`).
2. Verificá la instalación desde la Store.
3. Probá el popup y el menú contextual en una página real.
4. Compartí el enlace.

## Actualizaciones

Para publicar una versión nueva:

1. Cambiar `version` en `manifest.json`.
2. Regenerar el ZIP con el nuevo número.
3. En el mismo item, subir el paquete nuevo.
4. Enviar a revisión.

No crees otro item: se mantienen la URL y las instalaciones.

## GitHub Pages

La política de privacidad y la página de prueba se sirven desde GitHub Pages:

- https://xenner.github.io/jwt-decoder/privacy.html
- https://xenner.github.io/jwt-decoder/test/sample.html

Si Pages se desactiva, en **Settings → Pages** elegí **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guardá. El archivo `.nojekyll` ya está incluido.

## Checklist final

- [ ] Versión `1.0.0` en `manifest.json`.
- [ ] ZIP `dist/jwt-decoder-1.0.0.zip` con `manifest.json` en la raíz.
- [ ] Cuenta de desarrollador registrada y verificada.
- [ ] 2FA activo.
- [ ] Ficha en inglés completa.
- [ ] Capturas 1280×800 sin transparencia.
- [ ] Política de privacidad pública y accesible sin login.
- [ ] Justificación de `contextMenus`, `activeTab` y `scripting`.
- [ ] Página de prueba pública funcionando.
- [ ] Visibilidad `Public`, gratis, todas las regiones.
- [ ] Enviado a revisión.

## Posibles rechazos

- La política de privacidad no es pública o no carga sin login.
- Falta justificar `activeTab` o `scripting`.
- La ficha promete verificación de firma (la extensión no la hace).
- El revisor no puede probar el menú contextual: asegurate de que la página de prueba esté publicada y el token de ejemplo esté en las instrucciones.
- El ZIP tiene el manifest dentro de una subcarpeta.
