import { useRef, useState, useCallback, useEffect } from "react";

type Props = {
  beforeUrl: string;
  afterUrl?: string | null;
  description?: string;
  itemLabel?: string;
};

export default function BeforeAfter({ beforeUrl, afterUrl, description, itemLabel }: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, next)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      move(x);
    };
    const stop = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };
  }, [move]);

  return (
    <div
      ref={ref}
      className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-border bg-background select-none touch-none"
    >
      <img src={beforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" />

      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        {afterUrl ? (
          <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <img src={beforeUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-[2px] brightness-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/40 to-background/10" />
            {(description || itemLabel) && (
              <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-7 text-foreground">
                {itemLabel && <div className="font-display text-lg md:text-xl font-medium leading-tight mb-2">{itemLabel}</div>}
                {description && <p className="text-xs md:text-sm text-foreground/90 line-clamp-5">{description}</p>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute top-3 left-3 bg-background/80 backdrop-blur rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider">
        Before
      </div>
      <div className="absolute top-3 right-3 bg-accent/90 text-accent-foreground rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider">
        After
      </div>

      <div className="absolute inset-y-0 -ml-px" style={{ left: `${pos}%` }}>
        <div className="w-px h-full bg-foreground/80" />
        <button
          aria-label="Drag to compare"
          onMouseDown={() => (dragging.current = true)}
          onTouchStart={() => (dragging.current = true)}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-background border-2 border-foreground/80 shadow-lg flex items-center justify-center cursor-ew-resize"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
