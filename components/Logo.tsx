export function Logo({ height, inverted = false }: { height: number; inverted?: boolean }) {
  return (
    <img
      src="/logo.svg"
      height={height}
      style={{ width: "auto", ...(inverted ? { filter: "brightness(0) invert(1)" } : {}) }}
      alt="Mame Mart"
    />
  )
}
