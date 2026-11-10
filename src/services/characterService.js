// Servicio que centraliza todas las peticiones HTTP a Rick and Morty API.
// Los componentes nunca llaman a fetch() directamente: usan estas funciones.

const API_BASE_URL = 'https://rickandmortyapi.com/api/character';

/**
 * Error propio para distinguir los fallos HTTP (con código de estado)
 * de los fallos de red (sin conexión, API caída, CORS, etc.).
 */
export class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

/**
 * Realiza la petición, valida la respuesta y devuelve el JSON.
 * Deja pasar el AbortError para que el llamador pueda ignorarlo.
 */
async function request(url, signal) {
  let response;

  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      'No se pudo conectar con Rick and Morty API. Revisa tu conexión a internet e inténtalo de nuevo.'
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError('No se encontraron personajes.', 404);
    }
    throw new ApiError(
      `La API respondió con un error (código ${response.status}). Inténtalo más tarde.`,
      response.status
    );
  }

  const data = await response.json();

  if (!Array.isArray(data?.results)) {
    throw new ApiError('La API devolvió una respuesta con un formato inesperado.');
  }

  return data;
}

/**
 * Convierte la respuesta de la API en el formato que usa la aplicación.
 * La API entrega 20 personajes por página; la aplicación decide cuántos
 * mostrar (diez a la vez) y guarda el resto para el botón "Cargar más".
 */
function toCharacterPage(data) {
  return {
    results: data.results,
    totalCount: data.info?.count ?? data.results.length,
    nextPageUrl: data.info?.next ?? null,
  };
}

/** Obtiene el listado inicial de personajes (primera página de la API). */
export async function getCharacters({ signal } = {}) {
  const data = await request(API_BASE_URL, signal);
  return toCharacterPage(data);
}

/** Busca personajes por nombre (coincidencias completas o parciales). */
export async function searchCharactersByName(name, { signal } = {}) {
  const url = `${API_BASE_URL}/?name=${encodeURIComponent(name.trim())}`;
  const data = await request(url, signal);
  return toCharacterPage(data);
}

/** Obtiene la página siguiente usando la URL `info.next` que entrega la API. */
export async function getPageByUrl(url, { signal } = {}) {
  const data = await request(url, signal);
  return toCharacterPage(data);
}
