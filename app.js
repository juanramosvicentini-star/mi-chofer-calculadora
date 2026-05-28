/*
  1. Reemplazá el texto entre comillas por tu API key de Google Maps.
  2. Ejemplo: const GOOGLE_MAPS_API_KEY = "AIza...";
  3. Si la dejás vacía, la app carga en modo demo sin rutas reales.
*/
const GOOGLE_MAPS_API_KEY = "AIzaSyCbcYMbdwfcfrGFPQKs3qwKCNR0o53baJ0";

const STORAGE_KEY = "privateDriverCalculatorConfig";

const DEFAULT_CONFIG = {
  baseFare: 15000,
  rates: {
    tier1: 1850,
    tier2: 1700,
    tier3: 1600,
  },
  peakMultiplier: 1.15,
  cardSurcharge: 0.15,
  defaultTolls: 0,
  texts: {
    brandName: "Remis Ejecutivo",
    brandTagline: "Cotizador premium de traslados",
    eyebrow: "Choferes privados · Argentina",
    headline: "Calculá un traslado con precio claro en segundos.",
    intro:
      "Ingresá origen, destino y paradas opcionales. La tarifa se calcula con distancia real, recargos configurables y un resumen transparente para el pasajero.",
  },
};

const state = {
  config: loadConfig(),
  map: null,
  directionsService: null,
  directionsRenderer: null,
  googleReady: false,
};

const elements = {
  form: document.querySelector("#quoteForm"),
  calculateButton: document.querySelector("#calculateButton"),
  message: document.querySelector("#message"),
  origin: document.querySelector("#origin"),
  stop1: document.querySelector("#stop1"),
  stop2: document.querySelector("#stop2"),
  destination: document.querySelector("#destination"),
  paymentMethod: document.querySelector("#paymentMethod"),
  includeTolls: document.querySelector("#includeTolls"),
  manualTolls: document.querySelector("#manualTolls"),
  mapEmpty: document.querySelector("#mapEmpty"),
  finalTotal: document.querySelector("#finalTotal"),
  distanceValue: document.querySelector("#distanceValue"),
  durationValue: document.querySelector("#durationValue"),
  subtotalValue: document.querySelector("#subtotalValue"),
  peakValue: document.querySelector("#peakValue"),
  cardValue: document.querySelector("#cardValue"),
  tollsValue: document.querySelector("#tollsValue"),
  fareNote: document.querySelector("#fareNote"),
  adminToggle: document.querySelector("#adminToggle"),
  adminPanel: document.querySelector("#adminPanel"),
  adminForm: document.querySelector("#adminForm"),
  adminBaseFare: document.querySelector("#adminBaseFare"),
  adminRateTier1: document.querySelector("#adminRateTier1"),
  adminRateTier2: document.querySelector("#adminRateTier2"),
  adminRateTier3: document.querySelector("#adminRateTier3"),
  adminPeakMultiplier: document.querySelector("#adminPeakMultiplier"),
  adminCardSurcharge: document.querySelector("#adminCardSurcharge"),
  adminDefaultTolls: document.querySelector("#adminDefaultTolls"),
  adminBrandName: document.querySelector("#adminBrandName"),
  adminHeadline: document.querySelector("#adminHeadline"),
  adminIntro: document.querySelector("#adminIntro"),
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  applyTexts();
  bindEvents();
  hydrateAdminForm();
  loadGoogleMaps();
  showMessage("Ingresá una partida y un destino para calcular el traslado.");
}

function bindEvents() {
  elements.form.addEventListener("submit", handleQuoteSubmit);
  elements.adminToggle.addEventListener("click", toggleAdminPanel);
  elements.adminForm.addEventListener("submit", handleAdminSubmit);

  [elements.origin, elements.destination].forEach((input) => {
    input.addEventListener("input", () => input.classList.remove("invalid"));
  });
}

function loadConfig() {
  try {
    const savedConfig = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return mergeConfig(DEFAULT_CONFIG, savedConfig || {});
  } catch (error) {
    return structuredClone(DEFAULT_CONFIG);
  }
}

function mergeConfig(defaults, saved) {
  return {
    ...defaults,
    ...saved,
    rates: { ...defaults.rates, ...(saved.rates || {}) },
    texts: { ...defaults.texts, ...(saved.texts || {}) },
  };
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
}

function applyTexts() {
  Object.entries(state.config.texts).forEach(([key, value]) => {
    document.querySelectorAll(`[data-text="${key}"]`).forEach((node) => {
      node.textContent = value;
    });
  });
}

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) {
    showApiNotice();
    return;
  }

  window.initGoogleMaps = initGoogleMaps;

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
    GOOGLE_MAPS_API_KEY
  )}&libraries=places&callback=initGoogleMaps`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    showMessage("No se pudo cargar Google Maps. Revisá la API key y las APIs habilitadas.", "error");
  };
  document.head.appendChild(script);
}

function initGoogleMaps() {
  state.googleReady = true;
  state.map = new google.maps.Map(document.querySelector("#map"), {
    center: { lat: -34.6037, lng: -58.3816 },
    zoom: 11,
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
  });

  state.directionsService = new google.maps.DirectionsService();
  state.directionsRenderer = new google.maps.DirectionsRenderer({
    map: state.map,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: "#0e5f57",
      strokeOpacity: 0.95,
      strokeWeight: 6,
    },
  });

  initAutocomplete();
  elements.mapEmpty.hidden = true;
  showMessage("Google Maps está listo. Ya podés calcular rutas reales.", "success");
}

function initAutocomplete() {
  [elements.origin, elements.stop1, elements.stop2, elements.destination].forEach((input) => {
    new google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "geometry", "name"],
      componentRestrictions: { country: "ar" },
    });
  });
}

async function handleQuoteSubmit(event) {
  event.preventDefault();

  if (!validateQuoteForm()) {
    showMessage("Completá partida y destino para continuar.", "error");
    return;
  }

  setLoading(true);
  showMessage("Calculando recorrido y tarifa...");

  try {
    const route = await getRouteDetails();
    const quote = calculateQuote(route.distanceKm);
    renderQuote(route, quote);
    showMessage("Presupuesto calculado correctamente.", "success");
  } catch (error) {
    showMessage(error.message || "No pudimos calcular la ruta. Probá con direcciones más específicas.", "error");
  } finally {
    setLoading(false);
  }
}

function validateQuoteForm() {
  const requiredInputs = [elements.origin, elements.destination];
  let isValid = true;

  requiredInputs.forEach((input) => {
    const valid = input.value.trim().length >= 4;
    input.classList.toggle("invalid", !valid);
    if (!valid) isValid = false;
  });

  const tollValue = Number(elements.manualTolls.value);
  if (Number.isNaN(tollValue) || tollValue < 0) {
    elements.manualTolls.classList.add("invalid");
    isValid = false;
  } else {
    elements.manualTolls.classList.remove("invalid");
  }

  return isValid;
}

function getFilledStops() {
  return [elements.stop1.value.trim(), elements.stop2.value.trim()].filter(Boolean);
}

function getRouteDetails() {
  if (!state.googleReady) {
    throw new Error(
      "Google Maps todavía no está configurado. Podés colocar la API key en app.js para activar rutas reales."
    );
  }

  const request = {
    origin: elements.origin.value.trim(),
    destination: elements.destination.value.trim(),
    waypoints: getFilledStops().map((location) => ({ location, stopover: true })),
    travelMode: google.maps.TravelMode.DRIVING,
    provideRouteAlternatives: false,
    drivingOptions: {
      departureTime: new Date(),
      trafficModel: google.maps.TrafficModel.BEST_GUESS,
    },
  };

  return new Promise((resolve, reject) => {
    state.directionsService.route(request, (response, status) => {
      if (status !== "OK" || !response?.routes?.length) {
        reject(new Error(getRouteError(status)));
        return;
      }

      const route = response.routes[0];
      const totals = route.legs.reduce(
        (accumulator, leg) => ({
          distanceMeters: accumulator.distanceMeters + (leg.distance?.value || 0),
          durationSeconds:
            accumulator.durationSeconds +
            (leg.duration_in_traffic?.value || leg.duration?.value || 0),
        }),
        { distanceMeters: 0, durationSeconds: 0 }
      );

      state.directionsRenderer.setDirections(response);
      elements.mapEmpty.hidden = true;

      resolve({
        distanceKm: totals.distanceMeters / 1000,
        durationSeconds: totals.durationSeconds,
        includesTolls: route.warnings?.some((warning) => /peaje|toll/i.test(warning)) || false,
      });
    });
  });
}

function getRouteError(status) {
  const messages = {
    ZERO_RESULTS: "No encontramos una ruta manejable entre esas direcciones.",
    NOT_FOUND: "Alguna dirección no pudo reconocerse. Revisá el texto ingresado.",
    OVER_QUERY_LIMIT: "Se alcanzó el límite de consultas de Google Maps.",
    REQUEST_DENIED: "Google Maps rechazó la solicitud. Revisá la API key y las restricciones.",
    INVALID_REQUEST: "La solicitud de ruta está incompleta.",
  };

  return messages[status] || "No pudimos calcular esa ruta en este momento.";
}

function calculateQuote(distanceKm) {
  const subtotal = state.config.baseFare + calculateTieredDistancePrice(distanceKm);
  const isPeak = new FormData(elements.form).get("timeMode") === "peak";
  const paymentMethod = elements.paymentMethod.value;
  const manualTolls = Number(elements.manualTolls.value) || 0;
  const tolls = elements.includeTolls.checked ? manualTolls + state.config.defaultTolls : 0;
  const peakSurcharge = isPeak ? subtotal * (state.config.peakMultiplier - 1) : 0;
  const afterPeak = subtotal + peakSurcharge;
  const cardSurcharge = paymentMethod === "card" ? afterPeak * state.config.cardSurcharge : 0;
  const total = afterPeak + cardSurcharge + tolls;

  return {
    subtotal,
    peakSurcharge,
    cardSurcharge,
    tolls,
    total,
  };
}

function calculateTieredDistancePrice(distanceKm) {
  const firstTierKm = Math.min(distanceKm, 10);
  const secondTierKm = Math.min(Math.max(distanceKm - 10, 0), 15);
  const thirdTierKm = Math.max(distanceKm - 25, 0);

  return (
    firstTierKm * state.config.rates.tier1 +
    secondTierKm * state.config.rates.tier2 +
    thirdTierKm * state.config.rates.tier3
  );
}

function renderQuote(route, quote) {
  elements.distanceValue.textContent = `${route.distanceKm.toFixed(1)} km`;
  elements.durationValue.textContent = formatDuration(route.durationSeconds);
  elements.subtotalValue.textContent = formatCurrency(quote.subtotal);
  elements.peakValue.textContent = formatCurrency(quote.peakSurcharge);
  elements.cardValue.textContent = formatCurrency(quote.cardSurcharge);
  elements.tollsValue.textContent = formatCurrency(quote.tolls);
  elements.finalTotal.textContent = formatCurrency(quote.total);

  const tollMessage = route.includesTolls
    ? "La ruta parece incluir peajes. Google no informa el costo exacto en Directions API, por eso el importe queda editable."
    : "Si la ruta incluye peajes, cargá el importe manual o definí un peaje por defecto desde Admin.";
  elements.fareNote.textContent = tollMessage;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatDuration(totalSeconds) {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${minutes} min`;
  if (!remainingMinutes) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
}

function setLoading(isLoading) {
  elements.calculateButton.disabled = isLoading;
  elements.calculateButton.classList.toggle("is-loading", isLoading);
}

function showMessage(text, type = "") {
  elements.message.textContent = text;
  elements.message.className = `status-message ${type}`.trim();
}

function showApiNotice() {
  const template = document.querySelector("#googleApiNotice");
  elements.fareNote.innerHTML = "";
  elements.fareNote.append(template.content.cloneNode(true));
}

function toggleAdminPanel() {
  const isHidden = elements.adminPanel.hidden;
  elements.adminPanel.hidden = !isHidden;
  elements.adminToggle.setAttribute("aria-expanded", String(isHidden));
  if (isHidden) elements.adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hydrateAdminForm() {
  elements.adminBaseFare.value = state.config.baseFare;
  elements.adminRateTier1.value = state.config.rates.tier1;
  elements.adminRateTier2.value = state.config.rates.tier2;
  elements.adminRateTier3.value = state.config.rates.tier3;
  elements.adminPeakMultiplier.value = state.config.peakMultiplier;
  elements.adminCardSurcharge.value = state.config.cardSurcharge;
  elements.adminDefaultTolls.value = state.config.defaultTolls;
  elements.adminBrandName.value = state.config.texts.brandName;
  elements.adminHeadline.value = state.config.texts.headline;
  elements.adminIntro.value = state.config.texts.intro;
}

function handleAdminSubmit(event) {
  event.preventDefault();

  const updatedConfig = {
    ...state.config,
    baseFare: readPositiveNumber(elements.adminBaseFare, DEFAULT_CONFIG.baseFare),
    rates: {
      tier1: readPositiveNumber(elements.adminRateTier1, DEFAULT_CONFIG.rates.tier1),
      tier2: readPositiveNumber(elements.adminRateTier2, DEFAULT_CONFIG.rates.tier2),
      tier3: readPositiveNumber(elements.adminRateTier3, DEFAULT_CONFIG.rates.tier3),
    },
    peakMultiplier: Math.max(1, readPositiveNumber(elements.adminPeakMultiplier, 1.15)),
    cardSurcharge: readPositiveNumber(elements.adminCardSurcharge, 0.15),
    defaultTolls: readPositiveNumber(elements.adminDefaultTolls, 0),
    texts: {
      ...state.config.texts,
      brandName: elements.adminBrandName.value.trim() || DEFAULT_CONFIG.texts.brandName,
      headline: elements.adminHeadline.value.trim() || DEFAULT_CONFIG.texts.headline,
      intro: elements.adminIntro.value.trim() || DEFAULT_CONFIG.texts.intro,
    },
  };

  state.config = updatedConfig;
  saveConfig();
  applyTexts();
  showMessage("Cambios guardados. La próxima cotización usará estos valores.", "success");
}

function readPositiveNumber(input, fallback) {
  const value = Number(input.value);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
