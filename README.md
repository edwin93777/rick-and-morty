# Explorador de personajes de Rick and Morty

Aplicación web hecha con **React + Vite** que consume la API pública
[Rick and Morty API](https://rickandmortyapi.com/documentation) para listar,
buscar y filtrar personajes de la serie.

## Funcionalidades

- **Listado inicial de 10 personajes** obtenidos de la API al abrir la página.
- **Búsqueda por nombre** (coincidencias completas o parciales), con botón o tecla Enter.
- **Tres botones de acción**: Todos, Vivos y Muertos. Se combinan con la búsqueda
  (por ejemplo, buscar "rick" y luego pulsar Muertos).
- **Tarjetas** con imagen, nombre, estado, especie, tipo, género, origen y ubicación actual.
- **Indicador de resultados** ("Mostrando 10 personajes de 826 en total").
- **Estados de interfaz**: `Cargando...`, error de conexión con botón para reintentar,
  búsqueda sin coincidencias (404 de la API) y filtro sin resultados.
- **Diseño responsivo** con CSS Grid y Flexbox (escritorio, tableta y móvil).

Mejoras opcionales incluidas:

- Modal de detalles al hacer clic en una tarjeta (elemento `<dialog>` nativo).
- Paginación con el botón "Cargar 10 personajes más", usando `info.next` de la API.
- Estadísticas: cada botón de filtro muestra cuántos personajes vivos y muertos hay.
- Imagen de respaldo si una imagen no se puede cargar.

## Tecnologías

- React 19 (JavaScript y JSX, sin TypeScript)
- Vite 7
- CSS3 (Grid, Flexbox, variables CSS)
- Fetch API con `AbortController`

## API consumida

| Uso | Endpoint |
|---|---|
| Listado inicial | `GET https://rickandmortyapi.com/api/character` |
| Búsqueda | `GET https://rickandmortyapi.com/api/character/?name={nombre}` |
| Página siguiente | URL de `info.next` en la respuesta |

## Estructura de carpetas

```text
rick-and-morty-explorer/
├── public/
│   └── portal.svg              # ícono de la pestaña y logo
├── src/
│   ├── components/
│   │   ├── Navbar.jsx           # barra superior con identidad y navegación
│   │   ├── SearchBar.jsx        # campo de búsqueda + botón (Enter incluido)
│   │   ├── ActionButtons.jsx    # botones Todos / Vivos / Muertos
│   │   ├── CharacterGrid.jsx    # recorre la lista con .map() y key={id}
│   │   ├── CharacterCard.jsx    # tarjeta de un personaje
│   │   ├── CharacterModal.jsx   # detalles del personaje (opcional)
│   │   ├── Loading.jsx          # indicador "Cargando..."
│   │   └── ErrorMessage.jsx     # avisos de error y de "sin resultados"
│   ├── services/
│   │   └── characterService.js  # todas las peticiones fetch a la API
│   ├── utils/
│   │   └── labels.js            # traducción de estado y género al español
│   ├── App.jsx                  # estado principal, Hooks y composición
│   ├── App.css                  # estilos de la aplicación
│   ├── index.css                # variables de diseño y estilos base
│   └── main.jsx                 # punto de entrada
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Instalación y ejecución

Requisitos: Node.js 20.19 o superior (o 22.12+) y npm.

```bash
cd rick-and-morty-explorer
npm install
npm run dev
```

Abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).

Otros comandos:

```bash
npm run build     # genera la versión de producción en dist/
npm run preview   # sirve localmente la versión de producción
```

## Cómo funciona

- **`useState`** guarda `characters`, `loading`, `error`, `searchTerm` y `activeFilter`,
  además de la búsqueda aplicada, el total de resultados y el personaje seleccionado.
- **`useEffect`** hace la petición inicial al montar `App` y, en su limpieza,
  cancela la petición con `AbortController` si el componente se desmonta.
- La **búsqueda** se lanza desde el evento del formulario (no desde un efecto) y usa
  `encodeURIComponent` para codificar el nombre.
- Los **filtros** se calculan con `useMemo` sobre la lista actual, por eso se
  combinan con la búsqueda sin hacer peticiones nuevas.
- **`useRef`** guarda el controlador de cancelación, los personajes recibidos pero aún
  no mostrados y la URL de la página siguiente.
- Los datos bajan por **Props**: `App → CharacterGrid → CharacterCard`, y las acciones
  suben con funciones (`onSearch`, `onFilterChange`, `onSelect`).
