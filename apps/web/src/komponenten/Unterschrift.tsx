import { useEffect, useRef, useState } from "react";

/** Unterschriftenfeld für Stift (Apple Pencil), Finger oder Maus. Liefert ein PNG als Data-URL. */
export function UnterschriftFeld({ aendern }: { aendern: (bild: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const zeichnet = useRef(false);
  const [leer, setLeer] = useState(true);

  useEffect(() => {
    const c = canvas.current!;
    const passen = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1f2a14";
    };
    passen();
  }, []);

  const punkt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvas}
          aria-label="Unterschriftenfeld"
          className="h-44 w-full touch-none rounded-xl border-2 border-dashed border-sand-400 bg-white dark:bg-sand-50"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            zeichnet.current = true;
            const ctx = e.currentTarget.getContext("2d")!;
            const p = punkt(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!zeichnet.current) return;
            const ctx = e.currentTarget.getContext("2d")!;
            // Stiftdruck nutzen, wenn vorhanden
            ctx.lineWidth = e.pointerType === "pen" && e.pressure > 0 ? 1.2 + e.pressure * 2.6 : 2.4;
            const p = punkt(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }}
          onPointerUp={(e) => {
            zeichnet.current = false;
            setLeer(false);
            aendern(e.currentTarget.toDataURL("image/png"));
          }}
        />
        {leer && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400">Hier unterschreiben</span>}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-sand-400" />
      </div>
      <button
        type="button"
        className="mt-2 min-h-11 text-sm font-medium text-salbei-600"
        onClick={() => {
          const c = canvas.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          setLeer(true);
          aendern(null);
        }}
      >
        Unterschrift löschen
      </button>
    </div>
  );
}
