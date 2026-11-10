# Actividad: React y el Hook `useEffect`

**Material de clase:** [Video sobre `useEffect` en React](https://www.youtube.com/watch?v=6lvI-gTF_X8)  
**Tema:** Ciclo de vida de los componentes, efectos y otros Hooks de React.

## 1. Respuestas a las 10 preguntas

### 1. ¿Cuál es el comportamiento de un `useEffect` cuando no se le pasa un arreglo de dependencias?

Cuando no le pasamos un arreglo de dependencias, el `useEffect` se ejecuta después de cada renderizado del componente. En el video se ve con dos contadores, `counter1` y `counter2`: si aumentamos cualquiera de los dos, React actualiza el componente y el efecto vuelve a ejecutarse. O sea, no está pendiente de un contador específico, sino de cada renderizado. Por eso hay que tener cuidado con lo que hacemos dentro de él, porque algunas operaciones podrían repetirse sin necesidad.

### 2. ¿En qué momento exacto se ejecuta un `useEffect` que tiene un arreglo de dependencias vacío?

Cuando usamos `useEffect` con `[]`, su lógica se ejecuta después del primer renderizado, cuando el componente se monta, y no se repite por los cambios normales de sus estados. En el video lo usan para traer inicialmente un usuario de JSONPlaceholder en el componente `FetchCard`. Tiene sentido hacerlo así porque esa consulta inicial no necesita ejecutarse cada vez que cambia algo en la pantalla. Como detalle, si se usa `StrictMode` en desarrollo, React puede hacer una ejecución adicional de comprobación.

### 3. ¿Cómo afecta el orden de declaración al momento en que se ejecutan múltiples efectos en un mismo componente?

Los efectos se ejecutan siguiendo el orden en el que están escritos. El autor lo demuestra cambiando de posición el efecto sin dependencias y el efecto con arreglo vacío, y los mensajes de la consola también cambian de orden cuando se carga el componente. No hay un efecto con mayor prioridad por tener un tipo de dependencia diferente. Eso sí, si alguno hace una petición asíncrona, puede terminar después de otro aunque haya empezado primero.

### 4. Si un `useEffect` escucha una dependencia específica (como `counter1`), ¿cuándo se volverá a ejecutar su lógica?

Se ejecuta al montar el componente y después cuando cambia el valor de `counter1`. Si modificamos `counter2`, ese efecto no se ejecuta otra vez porque no lo tiene como dependencia. En el video se comprueba aumentando los contadores por separado y revisando la consola. También muestran que si escribimos `[counter1, counter2]`, el efecto se ejecuta cuando cambia cualquiera de los dos. Así controlamos mejor qué operaciones deben responder a cada estado.

### 5. ¿Por qué es importante verificar si un objeto existe (o usar encadenamiento opcional) antes de acceder a sus propiedades dentro de un `useEffect` asíncrono?

Porque cuando consultamos una API los datos no llegan de inmediato. En el ejemplo, `user` empieza como un objeto vacío, entonces su propiedad `id` todavía es `undefined` cuando se intenta consultar la lista de publicaciones. Eso hace que se envíe una petición innecesaria con un identificador que no sirve. El autor recomienda comprobar primero que exista un `id` válido y muestra el uso de `user?.id` para evitar errores si el objeto llega a ser `null` o `undefined`. Es una validación pequeña que nos evita consultas de más y problemas al cargar datos.

### 6. ¿Qué función cumple el `return` dentro de un `useEffect` y en qué momento del ciclo de vida se dispara?

El `return` puede devolver una función de limpieza, conocida como *cleanup*. Sirve para deshacer lo que configuramos dentro del efecto, como quitar eventos o detener un temporizador. En el video primero colocan un `console.log` en esa función para comprobar que se ejecuta al desmontar el componente. Después explican que también se ejecuta antes de volver a correr un efecto cuando cambian sus dependencias. Así se limpia lo anterior antes de preparar lo nuevo.

### 7. ¿Por qué es una buena práctica remover los *listeners* globales (como `resize`) dentro de la función de limpieza (*cleanup*) del efecto?

Porque si no los quitamos, pueden seguir activos cuando el componente ya desapareció. En el ejemplo de `ResizeApp`, cada vez que muestran el componente se registra un evento `resize` para detectar el ancho de la ventana, pero al ocultarlo ese evento seguía registrado. Si lo mostraban varias veces, se acumulaban *listeners* y algunos intentaban actualizar componentes desmontados. Por eso usan `removeEventListener` en el *cleanup*: así no quedan eventos duplicados consumiendo recursos ni intentando ejecutar funciones que ya no corresponden.

### 8. ¿Cuál es la diferencia entre la fase de renderizado del componente y la ejecución de los efectos?

Durante el renderizado React ejecuta el componente para calcular lo que debe mostrarse en pantalla. Los efectos se ejecutan después de que React confirma el renderizado y aplica los cambios correspondientes. El autor lo enseña colocando mensajes en la consola: primero aparece la lógica del render y después los efectos. Cuando se incrementa un contador se repite ese proceso, pero solo vuelven a ejecutarse los efectos que correspondan según sus dependencias. Yo lo entiendo como que una parte prepara la interfaz y la otra se encarga de tareas adicionales, como escuchar eventos o consultar datos.

### 9. ¿Por qué el autor desaconseja colocar procesos pesados directamente en el cuerpo del componente (fuera de los efectos)?

Porque lo que escribimos dentro de la función del componente se ejecuta otra vez cada vez que React lo renderiza, y un proceso pesado podría hacer que la aplicación se vuelva lenta. El video también muestra que ponerlo fuera del componente, en lo que el autor llama *pre-render*, tampoco es una solución: ese código se ejecuta cuando se importa el archivo, incluso si el componente todavía no se muestra. Entonces no se trata de mover cualquier tarea a otro lugar, sino de manejarla según su función. Para cálculos costosos que se puedan reutilizar, por ejemplo, existe `useMemo`; `useEffect` no hace que un cálculo pesado sea automáticamente más rápido.

### 10. Cuando un componente se desmonta, ¿qué sucede con todas las funciones de limpieza definidas en sus efectos?

React ejecuta las funciones de limpieza de los efectos activos que hayan definido una. Al final del video, el autor agrega una limpieza a cinco efectos y, cuando oculta el componente, aparecen las cinco en la consola. También muestra que, mientras el componente sigue montado, no se limpian todos los efectos cada vez que cambia un estado, sino únicamente los que deben volver a ejecutarse. Esto ayuda a retirar correctamente eventos y otros recursos que ya no se necesitan.

---

## 2. Diez conceptos fundamentales de React

### 1. React

React es una biblioteca de JavaScript que permite crear interfaces usando componentes. En lugar de tener toda la página en un solo archivo, podemos dividirla en partes más pequeñas que se pueden reutilizar. En el video se trabaja de esta forma con componentes como `LifeCycle`, `FetchCard` y `ResizeApp`.

### 2. Virtual DOM

El Virtual DOM es una representación en memoria de la interfaz. React compara los resultados de los renderizados para identificar qué partes necesitan cambiar en el DOM real. Esto facilita trabajar con interfaces dinámicas sin tener que actualizar manualmente cada elemento de la página.

### 3. Ciclo de vida de los componentes

Son las etapas por las que pasa un componente: se monta cuando aparece, se actualiza cuando cambian sus datos y se desmonta cuando deja de mostrarse. En el video estas etapas se observan al mostrar y ocultar componentes y revisar los mensajes que aparecen en la consola.

### 4. `useState`

Es un Hook que nos permite guardar y modificar datos dentro de un componente. Cuando usamos su función de actualización, React puede renderizar nuevamente para mostrar el valor actualizado. El ejemplo más claro del video son `counter1` y `counter2`, que cambian al presionar sus botones.

### 5. `useEffect`

Es un Hook utilizado para sincronizar el componente con operaciones externas, como eventos del navegador o consultas a una API. Puede ejecutarse en diferentes momentos según el arreglo de dependencias que le pasemos. Además, puede incluir una función de limpieza para retirar lo que ya no necesitemos.

### 6. Arreglo de dependencias

Es el segundo argumento de `useEffect` y sirve para indicar los valores que el efecto debe observar. Si no se escribe, el efecto corre después de cada renderizado; con `[]` queda asociado a la carga inicial; y con `[counter1]` se vuelve a ejecutar cuando cambia ese contador.

### 7. Renderizado

Es el proceso en el que React ejecuta el componente y calcula cómo debe quedar la interfaz. No es exactamente lo mismo que modificar el DOM, porque React primero calcula el resultado y después aplica los cambios necesarios. En el video se nota cuando actualizan un contador y vuelven a aparecer los mensajes del render.

### 8. Función de limpieza (*cleanup*)

Es la función que se devuelve desde un `useEffect` con `return`. Se usa para eliminar eventos, detener intervalos o cerrar conexiones. En `ResizeApp` sirve para retirar el evento `resize` y evitar que se acumulen *listeners* cada vez que el componente se muestra.

### 9. Operaciones asíncronas

Son tareas que tardan un tiempo en completarse, como obtener información de un servidor. En el video utilizan `fetch`, `async` y `await` para consultar usuarios y publicaciones de JSONPlaceholder. Como la respuesta no llega instantáneamente, es necesario revisar que los datos estén disponibles antes de utilizarlos.

### 10. `useCallback`

Es un Hook que permite mantener la referencia de una función entre renderizados mientras no cambien sus dependencias. En el video lo aplican a la función que consulta los posts, ya que esa función se estaba creando de nuevo en cada renderizado y generaba una advertencia al incluirla como dependencia de `useEffect`.

---

## 3. Breve investigación sobre otros Hooks de React

### `useRef`

`useRef` sirve para guardar una referencia o un valor que se mantiene entre renderizados sin provocar uno nuevo al modificar su propiedad `current`. Se puede usar, por ejemplo, para enfocar un campo de texto o guardar una referencia a un temporizador.

```jsx
const inputRef = useRef(null);

function enfocarInput() {
  inputRef.current?.focus();
}

// En el JSX: <input ref={inputRef} />
```

Aquí `inputRef` está conectado al campo de texto y permite acceder a él cuando necesitemos poner el cursor para escribir.

### `useContext`

`useContext` permite consultar información que varios componentes comparten, sin tener que pasarla mediante `props` por todos los componentes intermedios. Por ejemplo, puede servir para manejar el tema claro u oscuro de una aplicación.

```jsx
const tema = useContext(TemaContext);
```

Esta instrucción obtiene el valor del proveedor de `TemaContext` más cercano. Es una forma práctica de compartir datos que se necesitan en distintas partes de la interfaz.

### `useMemo`

`useMemo` permite reutilizar el resultado de un cálculo mientras sus dependencias no cambien. Es útil cuando tenemos una operación costosa que no queremos repetir innecesariamente en cada renderizado, como filtrar una lista grande.

```jsx
const disponibles = useMemo(() => {
  return productos.filter(producto => producto.disponible);
}, [productos]);
```

En este caso, React puede conservar el resultado del filtro y volver a calcularlo cuando cambie `productos`. Se relaciona con la recomendación del video de evitar procesos pesados repetidos durante los renderizados.
