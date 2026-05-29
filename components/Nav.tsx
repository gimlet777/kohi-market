export default function Nav() {
  return (
    <nav className="w-full px-8 py-5 flex items-center justify-between border-b border-stone-200/80 bg-[#f7f5f2]">
      <div className="flex items-baseline gap-3">
        <span className="text-xl font-medium text-[#34150F] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        
      </div>
      <div className="flex items-center gap-8 text-xs tracking-widest uppercase text-stone-400">
        <span>Roasters</span>
        <span>About</span>
      </div>
    </nav>
  );
}
