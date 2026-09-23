export default function Modal({
  onClose,
  title,
  subtitle,
  footer,
  maxWidth = 'max-w-md',
  bodyClassName = 'p-6',
  cardClassName = '',
  overlayClassName = '',
  children,
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ${overlayClassName}`}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl border border-white/60 bg-white/95 shadow-xl ${cardClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="border-b border-slate-200 p-4">
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        )}
        <div className={bodyClassName}>{children}</div>
        {footer && (
          <div className="border-t border-slate-200 p-4 text-right">{footer}</div>
        )}
      </div>
    </div>
  )
}
