import type { Frame, Size } from './core/schema';

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const HANDLE_CURSORS: Record<Handle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

export const HANDLE_POS: Record<Handle, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  e: { left: '100%', top: '50%' },
  se: { left: '100%', top: '100%' },
  s: { left: '50%', top: '100%' },
  sw: { left: '0%', top: '100%' },
  w: { left: '0%', top: '50%' },
};

const MIN_SIZE = 8;

export function deltaToStage(
  stage: HTMLElement,
  dxClient: number,
  dyClient: number,
  size: Size,
): { dx: number; dy: number } {
  const rect = stage.getBoundingClientRect();

  return {
    dx: rect.width ? (dxClient / rect.width) * size.width : 0,
    dy: rect.height ? (dyClient / rect.height) * size.height : 0,
  };
}

export function moveFrame(start: Frame, dx: number, dy: number): Frame {
  return {
    ...start,
    x: Math.round(start.x + dx),
    y: Math.round(start.y + dy),
  };
}

export function resizeFrame(
  start: Frame,
  handle: Handle,
  dx: number,
  dy: number,
  keepAspect = false,
): Frame {
  const east = handle.includes('e');
  const west = handle.includes('w');
  const south = handle.includes('s');
  const north = handle.includes('n');

  let width = start.width;
  let height = start.height;

  if (east) {
    width = Math.max(MIN_SIZE, start.width + dx);
  } else if (west) {
    width = Math.max(MIN_SIZE, start.width - dx);
  }
  if (south) {
    height = Math.max(MIN_SIZE, start.height + dy);
  } else if (north) {
    height = Math.max(MIN_SIZE, start.height - dy);
  }

  if (keepAspect && (east || west) && (north || south)) {
    const widthScale = width / start.width;
    const heightScale = height / start.height;
    const requestedScale =
      Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
    const scale = Math.max(
      requestedScale,
      MIN_SIZE / start.width,
      MIN_SIZE / start.height,
    );
    width = start.width * scale;
    height = start.height * scale;
  }

  const x = west ? start.x + start.width - width : start.x;
  const y = north ? start.y + start.height - height : start.y;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}
