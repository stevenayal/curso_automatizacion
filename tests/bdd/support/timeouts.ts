import { setDefaultTimeout } from '@cucumber/cucumber';

// Timeout por defecto de toda la suite (hooks y steps). El default de Cucumber (5 s) es menor
// que el arranque de Chromium y que los flujos reales contra el sandbox, así que los hooks que
// lanzan el navegador abortaban la corrida. Vive acá, en un solo lugar, porque
// setDefaultTimeout es global: un hook o step que necesite otro valor lo pasa en sus opciones,
// por ejemplo Before({ timeout: 120_000 }, ...).
setDefaultTimeout(60_000);
