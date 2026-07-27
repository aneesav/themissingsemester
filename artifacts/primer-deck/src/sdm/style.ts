import type { CSSProperties } from 'react';
import {
  SDM_POINT_TO_UNIT,
  type Asset,
  type Color,
  type Font,
  type Paint,
  type Stroke,
  type TextRun,
  type Theme,
} from './core/schema';

function themeValue(
  record: Record<string, string> | undefined,
  token: string,
): string | undefined {
  return record !== undefined && Object.hasOwn(record, token)
    ? record[token]
    : undefined;
}

export function resolveColor(color: Color, theme?: Theme): string {
  if (color.kind === 'rgb') {
    return color.value;
  }

  return themeValue(theme?.colors, color.token) ?? '#000000';
}

export function resolvePaint(
  color: Color,
  opacity: number | undefined,
  theme?: Theme,
): string {
  const hex = resolveColor(color, theme);
  if (opacity === undefined || opacity >= 1) {
    return hex;
  }
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

const SAFE_ACTION_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function sanitizeActionUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url, 'https://sdm.invalid/');

    return SAFE_ACTION_PROTOCOLS.has(parsed.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

export function resolveFont(
  font: Font | undefined,
  theme?: Theme,
): string | undefined {
  if (!font) {
    return undefined;
  }
  if (font.kind === 'family') {
    return font.family;
  }

  return themeValue(theme?.fonts, font.token);
}

export function resolveAssetSrc(
  assets: Record<string, Asset> | undefined,
  assetId: string,
  baseUrl: string,
): string | undefined {
  const src =
    assets !== undefined && Object.hasOwn(assets, assetId)
      ? assets[assetId].src
      : undefined;
  if (!src) {
    return undefined;
  }
  if (/^(https?:|data:|blob:|\/)/i.test(src)) {
    return src;
  }

  return `${baseUrl.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;
}

function cssUrl(src: string): string {
  const escaped = src.replace(
    /["\\\n\r\f]/g,
    (char) => `\\${char.charCodeAt(0).toString(16)} `,
  );

  return `url("${escaped}")`;
}

export function paintToBackground(
  paint: Paint,
  theme: Theme | undefined,
  resolveAsset: (assetId: string) => string | undefined,
): { background: string; opacity?: number } | undefined {
  switch (paint.kind) {
    case 'none':
      return undefined;
    case 'solid':
      return { background: resolvePaint(paint.color, paint.opacity, theme) };
    case 'linearGradient':
      return {
        background: `linear-gradient(${paint.angleDeg}deg, ${paint.stops
          .map(
            (stop) =>
              `${resolvePaint(stop.color, stop.opacity, theme)} ${Math.round(stop.offset * 100)}%`,
          )
          .join(', ')})`,
      };
    case 'image': {
      const src = resolveAsset(paint.assetId);
      const size = paint.fit === 'fill' ? '100% 100%' : paint.fit;

      return src
        ? {
            background: `center / ${size} no-repeat ${cssUrl(src)}`,
            opacity: paint.opacity,
          }
        : undefined;
    }
  }
}

export function strokeToBorder(
  stroke: Stroke | undefined,
  theme?: Theme,
): string | undefined {
  if (!stroke) {
    return undefined;
  }
  let dash = 'solid';
  if (stroke.dash === 'dash') {
    dash = 'dashed';
  } else if (stroke.dash === 'dot') {
    dash = 'dotted';
  }

  return `${stroke.widthPt * SDM_POINT_TO_UNIT}px ${dash} ${resolvePaint(stroke.color, stroke.opacity, theme)}`;
}

export function textRunStyle(run: TextRun, theme?: Theme): CSSProperties {
  const sizePt = run.sizePt ?? 18;

  return {
    color: run.color ? resolveColor(run.color, theme) : undefined,
    backgroundColor: run.highlight
      ? resolveColor(run.highlight, theme)
      : undefined,
    fontFamily: resolveFont(run.font, theme),
    fontSize: `calc(var(--sdm-fit, 1) * ${sizePt * SDM_POINT_TO_UNIT}px)`,
    fontWeight: run.weight,
    fontStyle: run.italic ? 'italic' : undefined,
    textDecoration:
      [run.underline ? 'underline' : '', run.strike ? 'line-through' : '']
        .filter(Boolean)
        .join(' ') || undefined,
    letterSpacing:
      run.letterSpacingPt === undefined
        ? undefined
        : `calc(var(--sdm-fit, 1) * ${run.letterSpacingPt * SDM_POINT_TO_UNIT}px)`,
    whiteSpace: 'pre-wrap',
  };
}
