export function MacWindow({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-border overflow-hidden ${className}`}>
      <div className="flex items-center gap-1.5 px-4 py-3 bg-zinc-50 border-b border-border">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="flex-1 bg-white rounded-md h-5 ml-3 border border-border max-w-[180px]" />
      </div>
      {children}
    </div>
  );
}
