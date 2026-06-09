// Compact nav logo — crops logo-mark.svg to show only the 豆MART characters.
// The mark SVG uses an A4 viewBox (0 0 210 297); characters sit at y≈100–215.
// We render the image oversized then clip it: container=36px tall, image=76px tall,
// offset up by 23px to hide the blank upper portion of the document.
export function NavLogo() {
  return (
    <div
      style={{ height: 36, width: 54, overflow: "hidden", flexShrink: 0 }}
      aria-label="Kohi Market"
      role="img"
    >
      <img
        src="/logo-mark.svg"
        alt=""
        aria-hidden="true"
        style={{ height: 76, width: "auto", marginTop: -23, display: "block" }}
      />
    </div>
  )
}
