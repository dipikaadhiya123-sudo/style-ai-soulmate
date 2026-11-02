// Zero-cost, real-time Basic Preview image composer.
// Runs entirely in the browser canvas — no AI or paid API call is made.
// The result is clearly labeled as NOT a realistic AI try-on.

export type BasicPreviewReason =
  | "RATE_LIMITED"
  | "CREDITS_EXHAUSTED"
  | "AI_UNAVAILABLE"
  | "AI_NOT_CONFIGURED"
  | "NO_AI";

const REASON_COPY: Record<BasicPreviewReason, string> = {
  RATE_LIMITED: "Realistic AI try-on is busy right now — this free preview was made without AI.",
  CREDITS_EXHAUSTED: "AI credits are used up for now — this free preview was made without AI.",
  AI_UNAVAILABLE: "The AI service is temporarily unavailable — this free preview was made without AI.",
  AI_NOT_CONFIGURED: "Realistic AI try-on isn't set up yet — this free preview was made without AI.",
  NO_AI: "Free preview — made without AI.",
};

export function basicPreviewReasonCopy(reason: string): string {
  return REASON_COPY[(reason as BasicPreviewReason)] ?? REASON_COPY.NO_AI;
}

export type ComposedPreview = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
};

// Theme constants kept in sync with the app palette (cream bg, terracotta accent).
const THEME = {
  bg: "#F8F4EF",
  card: "#FFFFFF",
  border: "#E5DDD2",
  ink: "#2B2118",
  muted: "#8A7C6E",
  accent: "#C7432A",
  accentText: "#FFFFFF",
};

const FONT = "ui-sans-serif, system-ui, -apple-system, sans-serif";

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Remote retailer/storage URLs: request CORS so the canvas stays exportable.
    if (!/^(data:|blob:)/.test(src)) img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src.slice(0, 120)}`));
    img.src = src;
  });
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  pad: number,
) {
  const scale = Math.min((w - pad * 2) / img.width, (h - pad * 2) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

/**
 * Composes a single shareable image: your photo beside the product photo,
 * with a clear "Basic Preview (no AI)" label. Returns null when either image
 * can't be loaded or the canvas is blocked (e.g. cross-origin taint).
 */
export async function composeBasicPreviewImage(
  personSrc: string,
  garmentSrc: string,
  reason: string,
): Promise<ComposedPreview | null> {
  try {
    const [person, garment] = await Promise.all([loadImage(personSrc), loadImage(garmentSrc)]);

    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.textAlign = "center";
    ctx.fillStyle = THEME.ink;
    ctx.font = `600 48px ${FONT}`;
    ctx.fillText("Basic Preview", W / 2, 104);

    const copy = basicPreviewReasonCopy(reason);
    ctx.fillStyle = THEME.muted;
    ctx.font = `400 27px ${FONT}`;
    const copyLines = wrapText(ctx, copy, W - 160, 2);
    copyLines.forEach((line, i) => ctx.fillText(line, W / 2, 168 + i * 38));

    // Side-by-side cards
    const margin = 64;
    const gap = 40;
    const cardW = (W - margin * 2 - gap) / 2;
    const cardY = 260;
    const cardH = 780;

    const cards: { img: HTMLImageElement; label: string }[] = [
      { img: person, label: "Your photo" },
      { img: garment, label: "Product" },
    ];
    cards.forEach((card, i) => {
      const x = margin + i * (cardW + gap);
      ctx.fillStyle = THEME.card;
      roundedRectPath(ctx, x, cardY, cardW, cardH, 28);
      ctx.fill();
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 3;
      ctx.stroke();

      drawContained(ctx, card.img, x, cardY, cardW, cardH, 24);

      ctx.fillStyle = THEME.muted;
      ctx.font = `500 26px ${FONT}`;
      ctx.fillText(card.label.toUpperCase(), x + cardW / 2, cardY + cardH + 56);
    });

    // Disclaimer pill
    const pillText = "This is not a realistic AI try-on";
    ctx.font = `600 28px ${FONT}`;
    const pillW = ctx.measureText(pillText).width + 72;
    const pillH = 64;
    const pillX = (W - pillW) / 2;
    const pillY = 1150;
    ctx.fillStyle = THEME.accent;
    roundedRectPath(ctx, pillX, pillY, pillW, pillH, 32);
    ctx.fill();
    ctx.fillStyle = THEME.accentText;
    ctx.fillText(pillText, W / 2, pillY + 42);

    ctx.fillStyle = THEME.muted;
    ctx.font = `400 23px ${FONT}`;
    ctx.fillText("Made instantly in your browser — no AI service used", W / 2, 1266);

    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      } catch {
        resolve(null); // tainted canvas (cross-origin image without CORS)
      }
    });
    if (!blob) return null;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    return { blob, dataUrl, width: W, height: H };
  } catch {
    return null;
  }
}
