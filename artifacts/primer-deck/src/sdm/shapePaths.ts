import type { Geometry } from './core/schema';

type PathBuilder = (
  w: number,
  h: number,
  adjustments?: Record<string, number>,
) => string;

function polygon(points: Array<[number, number]>): string {
  return `M ${points.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L ')} Z`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function arrowInsets(w: number, h: number): { head: number; shaft: number } {
  return { head: Math.min(w / 2, h), shaft: h / 4 };
}

const PRESET_PATHS: Record<string, PathBuilder> = {
  triangle: (w, h) =>
    polygon([
      [w / 2, 0],
      [w, h],
      [0, h],
    ]),
  rtTriangle: (w, h) =>
    polygon([
      [0, 0],
      [w, h],
      [0, h],
    ]),
  diamond: (w, h) =>
    polygon([
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
      [0, h / 2],
    ]),
  parallelogram: (w, h) => {
    const inset = w / 4;
    return polygon([
      [inset, 0],
      [w, 0],
      [w - inset, h],
      [0, h],
    ]);
  },
  trapezoid: (w, h) => {
    const inset = w / 4;
    return polygon([
      [inset, 0],
      [w - inset, 0],
      [w, h],
      [0, h],
    ]);
  },
  chevron: (w, h, adjustments) => {
    const depth =
      Math.min(w, h) * Math.min(Math.max(adjustments?.depth ?? 0.5, 0), 0.5);
    return polygon([
      [0, 0],
      [w - depth, 0],
      [w, h / 2],
      [w - depth, h],
      [0, h],
      [depth, h / 2],
    ]);
  },
  homePlate: (w, h) => {
    const depth = Math.min(w / 2, h / 2);
    return polygon([
      [0, 0],
      [w - depth, 0],
      [w, h / 2],
      [w - depth, h],
      [0, h],
    ]);
  },
  rightArrow: (w, h) => {
    const { head, shaft } = arrowInsets(w, h);
    return polygon([
      [0, shaft],
      [w - head, shaft],
      [w - head, 0],
      [w, h / 2],
      [w - head, h],
      [w - head, h - shaft],
      [0, h - shaft],
    ]);
  },
  leftArrow: (w, h) => {
    const { head, shaft } = arrowInsets(w, h);
    return polygon([
      [w, shaft],
      [head, shaft],
      [head, 0],
      [0, h / 2],
      [head, h],
      [head, h - shaft],
      [w, h - shaft],
    ]);
  },
  upArrow: (w, h) => {
    const head = Math.min(h / 2, w);
    const shaft = w / 4;
    return polygon([
      [shaft, h],
      [shaft, head],
      [0, head],
      [w / 2, 0],
      [w, head],
      [w - shaft, head],
      [w - shaft, h],
    ]);
  },
  downArrow: (w, h) => {
    const head = Math.min(h / 2, w);
    const shaft = w / 4;
    return polygon([
      [shaft, 0],
      [shaft, h - head],
      [0, h - head],
      [w / 2, h],
      [w, h - head],
      [w - shaft, h - head],
      [w - shaft, 0],
    ]);
  },
  leftRightArrow: (w, h) => {
    const head = Math.min(w / 3, h);
    const shaft = h / 4;
    return polygon([
      [0, h / 2],
      [head, 0],
      [head, shaft],
      [w - head, shaft],
      [w - head, 0],
      [w, h / 2],
      [w - head, h],
      [w - head, h - shaft],
      [head, h - shaft],
      [head, h],
    ]);
  },
  pentagon: (w, h) =>
    polygon([
      [w / 2, 0],
      [w, h * 0.38],
      [w * 0.81, h],
      [w * 0.19, h],
      [0, h * 0.38],
    ]),
  hexagon: (w, h) => {
    const inset = Math.min(w / 4, h / 2);
    return polygon([
      [inset, 0],
      [w - inset, 0],
      [w, h / 2],
      [w - inset, h],
      [inset, h],
      [0, h / 2],
    ]);
  },
  octagon: (w, h) => {
    const cut = Math.min(w, h) * 0.29;
    return polygon([
      [cut, 0],
      [w - cut, 0],
      [w, cut],
      [w, h - cut],
      [w - cut, h],
      [cut, h],
      [0, h - cut],
      [0, cut],
    ]);
  },
  plus: (w, h) => {
    const armX = w / 4;
    const armY = h / 4;
    return polygon([
      [armX, 0],
      [w - armX, 0],
      [w - armX, armY],
      [w, armY],
      [w, h - armY],
      [w - armX, h - armY],
      [w - armX, h],
      [armX, h],
      [armX, h - armY],
      [0, h - armY],
      [0, armY],
      [armX, armY],
    ]);
  },
  star5: (w, h) => {
    const outerX = w / 2;
    const outerY = h / 2;
    const points: Array<[number, number]> = [];
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 === 0 ? 1 : 0.382;
      points.push([
        outerX + Math.cos(angle) * radius * outerX,
        outerY + Math.sin(angle) * radius * outerY,
      ]);
    }
    return polygon(points);
  },
};

export interface ShapePath {
  d: string;
  viewBox: { width: number; height: number };
}

export function shapePathFor(
  geometry: Geometry,
  width: number,
  height: number,
): ShapePath | undefined {
  if (geometry.kind === 'path') {
    return { d: geometry.path, viewBox: geometry.viewBox };
  }
  if (!Object.hasOwn(PRESET_PATHS, geometry.preset)) {
    return undefined;
  }

  return {
    d: PRESET_PATHS[geometry.preset](
      width,
      height,
      geometry.adjustments,
    ),
    viewBox: { width, height },
  };
}
