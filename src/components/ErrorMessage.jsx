// Muestra dos tipos de aviso:
//  - variant="error": no se pudo obtener información de la API.
//  - variant="empty": la consulta funcionó pero no hay coincidencias.
function ErrorMessage({ variant = 'error', title, message, actionLabel, onAction }) {
  return (
    <div
      className={`notice notice--${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <h2 className="notice__title">{title}</h2>
      {message && <p className="notice__message">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className="button button--ghost" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
