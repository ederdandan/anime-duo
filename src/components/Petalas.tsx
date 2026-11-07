// Pétalas de sakura caindo devagar pela tela.
// Cada linha: [posição horizontal em %, atraso em segundos, duração em segundos]
const PETALAS: [number, number, number][] = [
  [6, 0, 14], [18, 5, 17], [31, 2, 12], [45, 9, 16], [58, 3.5, 13],
  [70, 7, 18], [83, 1, 15], [93, 11, 14],
]

export default function Petalas() {
  return (
    <div aria-hidden="true">
      {PETALAS.map(([esquerda, atraso, duracao], i) => (
        <span
          key={i}
          className="petala"
          style={{ left: `${esquerda}%`, animationDelay: `${atraso}s`, animationDuration: `${duracao}s` }}
        />
      ))}
    </div>
  )
}
