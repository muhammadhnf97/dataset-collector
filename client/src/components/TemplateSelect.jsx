export default function TemplateSelect({ templates, value, onChange, className = '' }) {
  const grouped = Object.entries(
    templates.reduce((acc, t) => {
      const group = t.framework || 'Other'
      if (!acc[group]) acc[group] = []
      acc[group].push(t)
      return acc
    }, {}),
  ).sort((a, b) => a[0].localeCompare(b[0]))
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ${className}`}
    >
      <option value="">No template</option>
      {grouped.map(([framework, items]) => (
        <optgroup key={framework} label={framework}>
          {items.map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
