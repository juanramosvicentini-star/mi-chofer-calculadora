# Calculadora de traslados privados

Proyecto estático listo para deployar con HTML, CSS y JavaScript vanilla.

## Dónde colocar la API key de Google Maps

Abrí `app.js` y reemplazá esta línea:

```js
const GOOGLE_MAPS_API_KEY = "";
```

por:

```js
const GOOGLE_MAPS_API_KEY = "TU_API_KEY";
```

## APIs necesarias en Google Cloud

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/).
2. Creá o seleccioná un proyecto.
3. Activá la facturación del proyecto.
4. En "APIs y servicios", habilitá:
   - Maps JavaScript API
   - Places API
   - Directions API
5. Creá una API key en "Credenciales".
6. Restringí la key por dominio cuando publiques el sitio.
7. En restricciones de API, permití solo las tres APIs anteriores.

## Peajes

Google Directions API puede advertir que una ruta incluye peajes, pero no suele devolver el costo exacto del peaje. Por eso la app incluye:

- Campo "Peajes manuales" en la calculadora.
- "Peaje por defecto" editable desde el panel admin.
- Resumen separado de peajes.

## Panel administrador

Tocá el botón `Admin` en la parte superior. Desde ahí podés modificar:

- Precio mínimo del viaje.
- Valores por km para los tres tramos.
- Multiplicador de hora pico.
- Recargo por tarjeta.
- Peaje por defecto.
- Textos principales de la web.

Los datos se guardan en `localStorage`, por lo que quedan persistidos en el navegador donde se editaron.

## Regla de cálculo

La calculadora no suma el precio mínimo al valor por kilómetros. Primero calcula el recorrido por tramos escalonados y luego aplica el piso mínimo del viaje:

```txt
subtotal = mayor entre precio mínimo y precio por kilómetros
```

Después de ese subtotal se aplican, si corresponden, hora pico, recargo por tarjeta y peajes.

## Deploy gratis

### Netlify

1. Entrá a [Netlify](https://www.netlify.com/).
2. Arrastrá la carpeta del proyecto al área de deploy.
3. Configurá la restricción de la API key con el dominio que te asigne Netlify.

### Vercel

1. Entrá a [Vercel](https://vercel.com/).
2. Importá el proyecto desde GitHub o subí la carpeta.
3. No requiere build command porque es un sitio estático.

### GitHub Pages

1. Subí estos archivos a un repositorio.
2. En Settings > Pages, elegí la rama principal.
3. Publicá desde la raíz del repositorio.

## Archivos

- `index.html`: estructura de la aplicación.
- `styles.css`: diseño responsive y estética visual.
- `app.js`: lógica de tarifas, Google Maps, admin y localStorage.
