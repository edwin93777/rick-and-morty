// Frases para la pantalla de carga: muletillas de la serie y frases
// escritas al estilo de Rick.
export const RICK_QUOTES = [
  '¡Wubba lubba dub dub!',
  'Calibrando la pistola de portales… *burp*… no toques nada, Morty.',
  'Cinco segundos, Morty. En la dimensión C-137 eso es una eternidad.',
  'Estoy buscando en 826 realidades a la vez. De nada.',
  'Tranquilo, Morty: entramos y salimos. Una aventura de veinte minutos.',
  'Nadie existe a propósito… pero estas tarjetas sí van a cargar.',
  'Abriendo un portal a la base de datos. No mires directamente al verde.',
  'Si esto tarda, la culpa es de Jerry. Siempre es de Jerry.',
  '¡Soy una barra de carga, Morty! ¡Barra de carga Riiick!',
  'El Consejo de Ricks no aprobó esta espera. Por eso me gusta.',
  'Recalculando el multiverso… *burp*… dame un segundo. O cinco.',
  'La ciencia no se apura, Morty. Bueno, yo sí, pero la API no.',
  '¡Y así es como se hace, pequeño! Casi. Todavía no. Espera.',
  'Hay infinitos Ricks esperando esta misma carga. Yo soy el más guapo.',
];

/** Índice aleatorio distinto de `previous` para no repetir frase seguida. */
export function nextQuoteIndex(previous = -1) {
  let index = Math.floor(Math.random() * RICK_QUOTES.length);
  if (index === previous) index = (index + 1) % RICK_QUOTES.length;
  return index;
}
