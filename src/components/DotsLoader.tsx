export default function DotsLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}
