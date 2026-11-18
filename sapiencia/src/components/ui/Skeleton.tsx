export default function Skeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      {/* Título */}
      <div className="h-8 bg-brand-purple/20 dark:bg-brand-lavender/20 rounded-lg w-2/3 mx-auto" />

      {/* Subtítulo */}
      <div className="h-4 bg-brand-purple/15 dark:bg-brand-lavender/15 rounded w-1/2 mx-auto" />

      {/* Cards simulados */}
      <div className="space-y-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-brand-beige/90 dark:bg-brand-purple-dark/90 backdrop-blur-md rounded-2xl p-6 border border-brand-lavender/40 dark:border-brand-purple/40 shadow-lg space-y-3"
          >
            <div className="h-5 bg-brand-purple/20 dark:bg-brand-lavender/20 rounded w-3/4" />
            <div className="h-4 bg-brand-purple/15 dark:bg-brand-lavender/15 rounded w-full" />
            <div className="h-4 bg-brand-purple/15 dark:bg-brand-lavender/15 rounded w-5/6" />
          </div>
        ))}
      </div>
    </div>
  )
}