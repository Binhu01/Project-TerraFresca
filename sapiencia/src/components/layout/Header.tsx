export default function Header() {
  return (
    <header className="w-full px-6 py-5">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <a href="#inicio" className="flex items-center gap-3 group" aria-label="Sapiência - Início">
          <img
            src="/logo-sapiencia.png"
            alt="Sapiência"
            className="w-10 h-10 object-contain drop-shadow-sm group-hover:drop-shadow-md transition-all"
          />
          <span className="font-display text-2xl font-semibold text-brand-purple-deep dark:text-brand-beige tracking-tight">
            Sapiência
          </span>
        </a>
      </div>
    </header>
  )
}