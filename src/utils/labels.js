// Traducciones de los valores que devuelve la API para mostrarlos en español.
// Si llega un valor nuevo que no está en la tabla, se muestra tal cual.

const STATUS_LABELS = {
  Alive: 'Vivo',
  Dead: 'Muerto',
  unknown: 'Desconocido',
};

const GENDER_LABELS = {
  Male: 'Masculino',
  Female: 'Femenino',
  Genderless: 'Sin género',
  unknown: 'Desconocido',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? 'Desconocido';
}

export function getGenderLabel(gender) {
  return GENDER_LABELS[gender] ?? gender ?? 'Desconocido';
}

/** Clase CSS según el estado: vivo, muerto o desconocido. */
export function getStatusClass(status) {
  if (status === 'Alive') return 'status--alive';
  if (status === 'Dead') return 'status--dead';
  return 'status--unknown';
}

/** Devuelve el texto o un valor por defecto cuando la API lo deja vacío. */
export function orUnknown(value) {
  if (!value || value === 'unknown') return 'Desconocido';
  return value;
}
