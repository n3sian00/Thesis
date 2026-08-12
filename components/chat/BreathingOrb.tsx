interface Props {
  className?: string
}

export default function BreathingOrb({ className = '' }: Props) {
  return (
    <div
      aria-hidden
      className={`rounded-full motion-safe:animate-breathing-orb ${className}`}
      style={{
        background: 'radial-gradient(circle at 35% 35%, #F3C5A6, #E7A6B0)',
      }}
    />
  )
}
