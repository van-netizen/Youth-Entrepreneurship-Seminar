import { certificateLayout, seminar } from "./config";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#f7f3ea";
  ctx.fillRect(0, 0, w, h);

  const border = 36;
  ctx.strokeStyle = "#c4a35a";
  ctx.lineWidth = 4;
  ctx.strokeRect(border, border, w - border * 2, h - border * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(border + 12, border + 12, w - (border + 12) * 2, h - (border + 12) * 2);

  ctx.fillStyle = "#c4a35a";
  ctx.beginPath();
  ctx.arc(w / 2, 168, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f3ea";
  ctx.font = '600 22px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillText("SL", w / 2, 176);

  ctx.fillStyle = "#6b5a32";
  ctx.font = '500 18px "Source Sans 3", sans-serif';
  ctx.fillText(seminar.organization.toUpperCase(), w / 2, 230);

  ctx.fillStyle = "#1a2744";
  ctx.font = '600 42px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(seminar.subtitle.toUpperCase(), w / 2, 300);

  ctx.fillStyle = "#5c6578";
  ctx.font = '400 20px "Source Sans 3", sans-serif';
  ctx.fillText("This certifies that", w / 2, 380);

  ctx.beginPath();
  ctx.strokeStyle = "#d7c49a";
  ctx.lineWidth = 1;
  ctx.moveTo(w * 0.18, h * 0.58);
  ctx.lineTo(w * 0.82, h * 0.58);
  ctx.stroke();

  ctx.fillStyle = "#5c6578";
  ctx.font = '400 20px "Source Sans 3", sans-serif';
  ctx.fillText("has actively participated in", w / 2, h * 0.64);

  ctx.fillStyle = "#1a2744";
  ctx.font = '600 34px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(seminar.title, w / 2, h * 0.71);

  ctx.fillStyle = "#6b5a32";
  ctx.font = '500 18px "Source Sans 3", sans-serif';
  ctx.fillText(seminar.dateLabel, w / 2, h * 0.78);
}

function drawName(ctx: CanvasRenderingContext2D, name: string, w: number, h: number) {
  const { name: layout } = certificateLayout;
  ctx.fillStyle = layout.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = w * layout.maxWidth;
  const minFontSize = Math.round(layout.fontSize * 0.6);

  // Try to fit the full name on a single line first, shrinking the font
  // only as needed so long names from the spreadsheet still fit elegantly.
  let lines: string[] = [name.trim()];
  let fontSize = layout.fontSize;

  if (lines[0]) {
    for (let size = layout.fontSize; size >= minFontSize; size -= 2) {
      ctx.font = `700 ${size}px ${layout.fontFamily}`;
      if (ctx.measureText(lines[0]).width <= maxWidth) {
        fontSize = size;
        break;
      }
    }
    // Only wrap into two lines if even the minimum font size is too wide.
    if (ctx.measureText(lines[0]).width > maxWidth) {
      fontSize = minFontSize;
      ctx.font = `700 ${fontSize}px ${layout.fontFamily}`;
      lines = wrapText(ctx, name, maxWidth);
    }
  }

  const lineHeight = fontSize * 1.12;
  const startY = h * layout.y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, w * layout.x, startY + i * lineHeight);
  });
}

export async function renderCertificate(
  canvas: HTMLCanvasElement,
  recipientName: string,
): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const { width: w, height: h } = certificateLayout;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  if (certificateLayout.useCustomTemplate) {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        resolve();
      };
      img.onerror = () => reject(new Error("Could not load certificate template image."));
      img.src = certificateLayout.templateUrl;
    });
  } else {
    drawPlaceholder(ctx, w, h);
  }

  drawName(ctx, recipientName, w, h);
}

export function downloadCertificate(canvas: HTMLCanvasElement, recipientName: string) {
  const slug = recipientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const link = document.createElement("a");
  link.download = `e-certificate-${slug || "participant"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
