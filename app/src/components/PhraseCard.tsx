interface Props {
  text: string
}

export function PhraseCard({ text }: Props) {
  return (
    <div
      className="glass w-full rounded-3xl px-6 py-8 md:px-10 md:py-12 text-center shadow-xl"
      style={{ borderColor: 'rgb(var(--p) / 0.2)' }}
    >
      {/* Decorative quote mark */}
      <div className="text-4xl mb-3 select-none" style={{ color: 'rgb(var(--p) / 0.4)' }} aria-hidden>
        "
      </div>
      <p
        className="font-extrabold leading-snug text-white tracking-tight"
        style={{ fontSize: 'clamp(1.3rem, 4.5vw, 2.25rem)' }}
        lang="auto"
      >
        {text}
      </p>
      <div className="text-4xl mt-3 select-none" style={{ color: 'rgb(var(--p) / 0.4)' }} aria-hidden>
        "
      </div>
    </div>
  )
}
