interface Props {
  text: string
}

export function PhraseCard({ text }: Props) {
  return (
    <div
      className="
        w-full rounded-2xl bg-slate-800 border border-slate-700
        p-6 md:p-10 text-center shadow-xl
      "
    >
      <p
        className="font-bold leading-snug text-white"
        style={{ fontSize: 'clamp(1.25rem, 4vw, 2.25rem)' }}
        lang="auto"
      >
        {text}
      </p>
    </div>
  )
}
