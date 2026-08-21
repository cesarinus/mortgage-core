import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser } from "lucide-react";

export function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
      setHasInk(true);
    } else {
      setHasInk(false);
    }
  }, [value]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-40 w-full touch-none rounded-md border border-border bg-background"
        aria-label={`${label} signature area`}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{hasInk ? "Signature captured" : "Sign above"}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasInk(false);
            onChange("");
          }}
        >
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
