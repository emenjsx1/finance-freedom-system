/**
 * Centralised brand configuration.
 *
 * Every surface that names the product — manifest, install prompts, document
 * titles, push notifications — reads from here. Nothing hardcodes the name.
 */
export const APP_NAME = "Norte";
export const APP_SHORT_NAME = "Norte";
export const APP_TAGLINE = "A minha vida, organizada.";
export const APP_DESCRIPTION =
  "Dinheiro, planos e desenvolvimento pessoal no mesmo sistema.";

/** The brand lines — rotated every few seconds at account creation and on the Home. */
export const APP_QUOTES = [
  "Ter ambição não é o mesmo que ter direção. Podes trabalhar muito, ganhar dinheiro, criar negócios, estudar, experimentar projetos e ainda assim pensar: “Ok… mas para quê exatamente estou a construir tudo isto?”",
  "Organiza o teu dinheiro com calma e clareza.",
  "Dinheiro, planos e desenvolvimento pessoal no mesmo sistema.",
  "A minha vida, organizada.",
];

/** The primary brand line. */
export const APP_QUOTE = APP_QUOTES[0];

/** Matches the warm dark surface of the product. */
export const THEME_COLOR = "#1a1613";
export const BACKGROUND_COLOR = "#1a1613";

export const APP_ICON = "/icons/icon-512.png";
export const APP_ICON_SMALL = "/icons/icon-192.png";

export const APP_START_URL = "/app";
export const APP_SCOPE = "/";
