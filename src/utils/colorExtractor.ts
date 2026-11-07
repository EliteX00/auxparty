/**
 * Advanced High-Contrast Color Extraction Engine
 * Extracts dual contrasting colors (Warm & Cool duality) from album artwork
 * exactly like the reference UI (e.g. vibrant crimson on one side, cool cyan/teal on the other).
 * Guarantees high-contrast, lively ambient lighting that never looks muddy.
 */

export interface TrackPalette {
  primary: string; // Vibrant dominant color (e.g. deep crimson / purple)
  secondary: string; // Contrasting accent color (e.g. cyan / teal / amber)
  ambient: string; // Deep undertone
  primaryGlow: string; // High-contrast translucent glow
  secondaryGlow: string; // Contrasting accent glow
  gradientStyle: string; // Ready-to-use dual-glow radial background
}

const colorCache = new Map<string, TrackPalette>();

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function createPaletteFromHues(hue1: number, hue2: number): TrackPalette {
  const c1 = hslToRgb(hue1, 90, 52);
  const c2 = hslToRgb(hue2, 92, 50);
  const amb = hslToRgb(hue1, 70, 10);

  const p = `rgb(${c1[0]}, ${c1[1]}, ${c1[2]})`;
  const s = `rgb(${c2[0]}, ${c2[1]}, ${c2[2]})`;
  const pGlow = `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0.42)`;
  const sGlow = `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, 0.32)`;
  const ambStr = `rgb(${amb[0]}, ${amb[1]}, ${amb[2]})`;

  const gradient = `radial-gradient(circle at 22% 28%, ${pGlow} 0%, transparent 58%), radial-gradient(circle at 78% 72%, ${sGlow} 0%, transparent 54%)`;

  return {
    primary: p,
    secondary: s,
    ambient: ambStr,
    primaryGlow: pGlow,
    secondaryGlow: sGlow,
    gradientStyle: gradient,
  };
}

// Procedural fallback with dynamic complementary contrast
function hashStringToColors(str: string): TrackPalette {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash) % 360;
  // Complementary contrast (+140° to +180°)
  const hue2 = (hue1 + 155) % 360;
  return createPaletteFromHues(hue1, hue2);
}

// Default luxury palette: Electric Violet & Vivid Cyan
export const DEFAULT_PALETTE: TrackPalette = createPaletteFromHues(275, 185);

/**
 * Extracts high-contrast dual colors from artwork (dominant + complementary accent).
 */
export async function extractPalette(
  imageUrl?: string,
  fallbackSeed: string = 'auxparty'
): Promise<TrackPalette> {
  if (!imageUrl) {
    return hashStringToColors(fallbackSeed);
  }

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      const fallback = hashStringToColors(imageUrl || fallbackSeed);
      colorCache.set(imageUrl, fallback);
      resolve(fallback);
    }, 800);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          const fallback = hashStringToColors(imageUrl);
          colorCache.set(imageUrl, fallback);
          resolve(fallback);
          return;
        }

        const size = 24;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        // Group pixels into 12 hue buckets (every 30 deg)
        const buckets: { count: number; totalSat: number; avgHue: number }[] = Array.from(
          { length: 12 },
          () => ({ count: 0, totalSat: 0, avgHue: 0 })
        );

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;
          const [h, s, l] = rgbToHsl(r, g, b);

          // Filter out dull gray/black/white
          if (l < 15 || l > 88 || s < 20) continue;

          const bucketIdx = Math.floor(h / 30) % 12;
          buckets[bucketIdx].count++;
          buckets[bucketIdx].totalSat += s;
          buckets[bucketIdx].avgHue += h;
        }

        // Rank buckets by vibrancy
        const sortedBuckets = buckets
          .map((b, idx) => ({
            idx,
            score: b.count * (b.count > 0 ? b.totalSat / b.count : 0),
            hue: b.count > 0 ? Math.round(b.avgHue / b.count) : idx * 30 + 15,
          }))
          .sort((a, b) => b.score - a.score);

        let hue1 = 280;
        let hue2 = 175;

        if (sortedBuckets.length > 0 && sortedBuckets[0].score > 0) {
          hue1 = sortedBuckets[0].hue;

          // Look for contrasting second hue (at least 60° away on the color circle)
          let foundContrast = false;
          for (let k = 1; k < sortedBuckets.length; k++) {
            const cand = sortedBuckets[k];
            if (cand.score > 0) {
              const diff = Math.abs(cand.hue - hue1);
              const angleDist = Math.min(diff, 360 - diff);
              if (angleDist >= 55) {
                hue2 = cand.hue;
                foundContrast = true;
                break;
              }
            }
          }

          // If cover is monochromatic (e.g. pure red), synthesize the alive complementary hue
          // e.g. Red (0°) -> Cyan/Teal (180°), just like the reference photo!
          if (!foundContrast) {
            hue2 = (hue1 + 160) % 360;
          }
        }

        const palette = createPaletteFromHues(hue1, hue2);
        colorCache.set(imageUrl, palette);
        resolve(palette);
      } catch (e) {
        const fallback = hashStringToColors(imageUrl);
        colorCache.set(imageUrl, fallback);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      const fallback = hashStringToColors(imageUrl);
      colorCache.set(imageUrl, fallback);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}
