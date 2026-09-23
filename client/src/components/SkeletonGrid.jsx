export default function SkeletonGrid({
  count = 12,
  cols = 'grid-cols-6',
  aspect = 'aspect-video',
}) {
  return (
    <div className={`grid gap-3 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${aspect} animate-pulse rounded-lg bg-slate-200`}
        />
      ))}
    </div>
  )
}
