import { useEffect, useRef, useState } from 'react';
import LoadingPortal from './LoadingPortal.jsx';

// three.js y el modelo van en un chunk aparte para no engordar el bundle principal.
const loadScene = () => import('../three/portalScene.js').then((module) => module.loadPortal());

// Precarga: se piden en cuanto arranca la app, antes de que haga falta dibujar.
loadScene().catch(() => {});

/**
 * Portal de carga en 3D (modelo de Blender renderizado con three.js).
 * Si el navegador no tiene WebGL o falla la descarga, muestra el portal en CSS.
 */
function Portal3D() {
  const hostRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'failed'

  useEffect(() => {
    let active = true;
    let portal = null;

    loadScene()
      .then((instance) => {
        if (!active) return;
        portal = instance;
        portal.mount(hostRef.current);
        setStatus('ready');
      })
      .catch((error) => {
        console.warn('No se pudo iniciar el portal 3D; se usa el portal en CSS.', error);
        if (active) setStatus('failed');
      });

    return () => {
      active = false;
      portal?.unmount();
    };
  }, []);

  if (status === 'failed') return <LoadingPortal />;

  return (
    <span className={`portal3d portal3d--${status}`} aria-hidden="true">
      <span className="portal3d__halo" />
      <span ref={hostRef} className="portal3d__host" />
    </span>
  );
}

export default Portal3D;
