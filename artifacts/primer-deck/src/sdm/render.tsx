import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentType,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  SDM_POINT_TO_UNIT,
  type Action,
  type Element,
  type JsonValue,
  type Paint,
  type Paragraph,
  type SlideDocument,
  type Stroke,
  type TextBody,
  type Theme,
} from './core/schema';
import { shapePathFor, type ShapePath } from './shapePaths';
import {
  paintToBackground,
  resolveAssetSrc,
  resolveColor,
  resolvePaint,
  sanitizeActionUrl,
  strokeToBorder,
  textRunStyle,
} from './style';

export type WidgetProps = Record<string, JsonValue>;
export type WidgetModule = Record<string, ComponentType<WidgetProps>> & {
  default?: ComponentType<WidgetProps>;
};

export interface SdmRenderContextValue {
  baseUrl: string;
  widgets: Record<string, WidgetModule>;
}

export const SdmRenderContext = createContext<SdmRenderContextValue>({
  baseUrl: '/',
  widgets: {},
});

const MIN_FIT = 0.3;

function useAutofit(
  boxRef: RefObject<HTMLDivElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  padXUnits: number,
  padYUnits: number,
  signature: string,
): void {
  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) {
      return;
    }
    const refit = () => {
      box.style.setProperty('--sdm-fit', '1');
      if (!enabled) {
        return;
      }
      let fit = 1;
      for (let i = 0; i < 5; i += 1) {
        const availH = box.clientHeight - padYUnits;
        const availW = box.clientWidth - padXUnits;
        if (availH <= 0 || availW <= 0) {
          break;
        }
        const over = Math.max(
          content.scrollHeight / availH,
          content.scrollWidth / availW,
        );
        if (over <= 1.01) {
          break;
        }
        fit = Math.max(MIN_FIT, fit / over);
        box.style.setProperty('--sdm-fit', String(fit));
        if (fit <= MIN_FIT) {
          break;
        }
      }
    };
    refit();
    if (!enabled) {
      return;
    }
    const observer = new ResizeObserver(refit);
    observer.observe(box);

    return () => observer.disconnect();
  }, [boxRef, contentRef, enabled, padXUnits, padYUnits, signature]);
}

function frameStyle(element: Element): CSSProperties {
  return {
    position: 'absolute',
    left: element.frame.x,
    top: element.frame.y,
    width: element.frame.width,
    height: element.frame.height,
    transform:
      [
        element.rotationDeg ? `rotate(${element.rotationDeg}deg)` : '',
        element.flipH ? 'scaleX(-1)' : '',
        element.flipV ? 'scaleY(-1)' : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    opacity: element.opacity,
    display: element.hidden ? 'none' : undefined,
    transformOrigin: 'center center',
    boxSizing: 'border-box',
  };
}

function TextRunView({
  run,
  theme,
  onAction,
}: {
  run: TextBody['paragraphs'][number]['runs'][number];
  theme: Theme | undefined;
  onAction: ((action: Action) => void) | undefined;
}) {
  const content = run.text === '' ? '\u00a0' : run.text;
  if (run.action?.kind === 'openUrl') {
    const safeUrl = sanitizeActionUrl(run.action.url);
    if (!safeUrl) {
      return <span style={textRunStyle(run, theme)}>{content}</span>;
    }

    return (
      <a
        href={safeUrl}
        target={run.action.target === 'sameWindow' ? '_self' : '_blank'}
        rel="noreferrer"
        data-sdm-action={JSON.stringify(run.action)}
        style={textRunStyle(run, theme)}
        onClick={(event) => event.stopPropagation()}
      >
        {content}
      </a>
    );
  }
  if (run.action) {
    const action = run.action;

    return (
      <span
        role="link"
        tabIndex={0}
        data-sdm-action={JSON.stringify(action)}
        style={{ ...textRunStyle(run, theme), cursor: 'pointer' }}
        onClick={(event) => {
          event.stopPropagation();
          onAction?.(action);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          onAction?.(action);
        }}
      >
        {content}
      </span>
    );
  }

  return <span style={textRunStyle(run, theme)}>{content}</span>;
}

const INDENT_PT_PER_LEVEL = 36;

/* The tally continues across numbered paragraphs per level; startAt
 * overrides it, and an interrupting paragraph restarts its level and deeper. */
function paragraphMarkers(paragraphs: Array<Paragraph>): Array<string> {
  const counters = new Map<number, number>();

  return paragraphs.map((paragraph) => {
    const level = paragraph.level ?? 0;
    if (paragraph.bullet?.kind === 'number') {
      const count = paragraph.bullet.startAt ?? (counters.get(level) ?? 0) + 1;
      counters.set(level, count);
      for (const counterLevel of [...counters.keys()]) {
        if (counterLevel > level) {
          counters.delete(counterLevel);
        }
      }

      return `${count}. `;
    }
    for (const counterLevel of [...counters.keys()]) {
      if (counterLevel >= level) {
        counters.delete(counterLevel);
      }
    }
    if (paragraph.bullet?.kind === 'character') {
      return `${paragraph.bullet.character} `;
    }

    return '';
  });
}

export function TextBodyView({
  body,
  theme,
  onAction,
}: {
  body: TextBody;
  theme?: Theme;
  onAction?: (action: Action) => void;
}) {
  let vertical = 'flex-start';
  if (body.verticalAlign === 'middle') {
    vertical = 'center';
  } else if (body.verticalAlign === 'bottom') {
    vertical = 'flex-end';
  }
  const inset = body.insetsPt;
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const padXUnits = inset ? (inset.left + inset.right) * SDM_POINT_TO_UNIT : 0;
  const padYUnits = inset ? (inset.top + inset.bottom) * SDM_POINT_TO_UNIT : 0;
  const autofitEnabled = body.autofit !== 'none';
  useAutofit(
    boxRef,
    contentRef,
    autofitEnabled,
    padXUnits,
    padYUnits,
    JSON.stringify(body.paragraphs),
  );
  const markers = paragraphMarkers(body.paragraphs);

  return (
    <div
      ref={boxRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vertical,
        overflow: body.overflow === 'visible' ? 'visible' : 'hidden',
        padding: inset
          ? `${inset.top * SDM_POINT_TO_UNIT}px ${inset.right * SDM_POINT_TO_UNIT}px ${inset.bottom * SDM_POINT_TO_UNIT}px ${inset.left * SDM_POINT_TO_UNIT}px`
          : undefined,
        boxSizing: 'border-box',
      }}
    >
      <div ref={contentRef}>
        {body.paragraphs.map((paragraph, index) => {
          const marker = markers[index] ?? '';
          const markerRun = paragraph.runs[0] ?? { text: '' };
          const hasMarker =
            paragraph.bullet !== undefined && paragraph.bullet.kind !== 'none';

          return (
            <div
              key={index}
              style={{
                textAlign: paragraph.align,
                lineHeight: paragraph.lineHeight ?? 1.2,
                paddingLeft: paragraph.level
                  ? paragraph.level * INDENT_PT_PER_LEVEL * SDM_POINT_TO_UNIT
                  : undefined,
                marginTop: paragraph.spaceBeforePt
                  ? paragraph.spaceBeforePt * SDM_POINT_TO_UNIT
                  : undefined,
                marginBottom: paragraph.spaceAfterPt
                  ? paragraph.spaceAfterPt * SDM_POINT_TO_UNIT
                  : undefined,
              }}
            >
              {hasMarker ? (
                <span style={textRunStyle(markerRun, theme)}>{marker}</span>
              ) : null}
              {paragraph.runs.map((run, runIndex) => (
                <TextRunView
                  key={runIndex}
                  run={run}
                  theme={theme}
                  onAction={onAction}
                />
              ))}
              {!hasMarker && paragraph.runs.length === 0 ? (
                <span style={textRunStyle(markerRun, theme)}>{'\u200B'}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function gradientVector(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad) / 2;
  const dy = -Math.cos(rad) / 2;

  return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
}

type ResolvedBackground = ReturnType<typeof paintToBackground>;

export function backgroundValue(
  resolved: ResolvedBackground,
): string | undefined {
  return resolved?.opacity === undefined ? resolved?.background : undefined;
}

export function PaintLayer({
  resolved,
}: {
  resolved: ResolvedBackground;
}) {
  if (!resolved || resolved.opacity === undefined) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: resolved.background,
        opacity: resolved.opacity,
        pointerEvents: 'none',
      }}
    />
  );
}

function strokeDasharray(
  dash: Stroke['dash'],
  width: number,
): string | undefined {
  if (dash === 'dash') {
    return `${width * 3} ${width * 2}`;
  }
  if (dash === 'dot') {
    return `${width} ${width * 1.5}`;
  }

  return undefined;
}

function ShapeGeometryView({
  shapePath,
  fill,
  stroke,
  theme,
  resolveAsset,
}: {
  shapePath: ShapePath;
  fill: Paint;
  stroke: Stroke | undefined;
  theme: Theme | undefined;
  resolveAsset: (assetId: string) => string | undefined;
}) {
  const defId = useId();
  const { d, viewBox } = shapePath;
  const strokeProps = stroke
    ? {
        stroke: resolvePaint(stroke.color, stroke.opacity, theme),
        strokeWidth: stroke.widthPt * SDM_POINT_TO_UNIT,
        strokeDasharray: strokeDasharray(
          stroke.dash,
          stroke.widthPt * SDM_POINT_TO_UNIT,
        ),
        vectorEffect: 'non-scaling-stroke' as const,
      }
    : { stroke: 'none' };

  let fillValue = 'none';
  let fillOpacity: number | undefined;
  let defs: ReactNode = null;
  let imageLayer: ReactNode = null;

  if (fill.kind === 'solid') {
    fillValue = resolveColor(fill.color, theme);
    fillOpacity = fill.opacity;
  } else if (fill.kind === 'linearGradient') {
    const vector = gradientVector(fill.angleDeg);
    fillValue = `url(#${defId}-fill)`;
    defs = (
      <linearGradient id={`${defId}-fill`} {...vector}>
        {fill.stops.map((stop, index) => (
          <stop
            key={index}
            offset={stop.offset}
            stopColor={resolveColor(stop.color, theme)}
            stopOpacity={stop.opacity}
          />
        ))}
      </linearGradient>
    );
  } else if (fill.kind === 'image') {
    const src = resolveAsset(fill.assetId);
    if (src) {
      let aspect = 'xMidYMid slice';
      if (fill.fit === 'contain') {
        aspect = 'xMidYMid meet';
      } else if (fill.fit === 'fill') {
        aspect = 'none';
      }
      defs = (
        <clipPath id={`${defId}-clip`}>
          <path d={d} />
        </clipPath>
      );
      imageLayer = (
        <image
          href={src}
          width={viewBox.width}
          height={viewBox.height}
          preserveAspectRatio={aspect}
          clipPath={`url(#${defId}-clip)`}
          opacity={fill.opacity}
        />
      );
    }
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'block',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {defs ? <defs>{defs}</defs> : null}
      {imageLayer}
      <path
        d={d}
        fill={imageLayer ? 'none' : fillValue}
        fillOpacity={fillOpacity}
        {...strokeProps}
      />
    </svg>
  );
}

const LINE_MARKERS: Record<string, { path: string; refX: number; size: number }> =
  {
    triangle: { path: 'M 0 0 L 6 3 L 0 6 Z', refX: 5, size: 6 },
    stealth: { path: 'M 0 0 L 6 3 L 0 6 L 1.6 3 Z', refX: 5, size: 6 },
    diamond: { path: 'M 3 0 L 6 3 L 3 6 L 0 3 Z', refX: 3, size: 6 },
    oval: { path: 'M 3 0 A 3 3 0 1 0 3 6 A 3 3 0 1 0 3 0 Z', refX: 3, size: 6 },
  };

function LineMarker({
  id,
  kind,
  color,
}: {
  id: string;
  kind: string;
  color: string;
}) {
  const marker = LINE_MARKERS[kind];
  if (!marker) {
    return null;
  }

  return (
    <marker
      id={id}
      viewBox={`0 0 ${marker.size} ${marker.size}`}
      refX={marker.refX}
      refY={marker.size / 2}
      markerWidth={marker.size}
      markerHeight={marker.size}
      orient="auto-start-reverse"
    >
      <path d={marker.path} fill={color} />
    </marker>
  );
}

function LineView({
  element,
  theme,
}: {
  element: Extract<Element, { type: 'line' }>;
  theme: Theme | undefined;
}) {
  const markerId = useId();
  const { stroke } = element;
  const color = resolvePaint(stroke.color, stroke.opacity, theme);
  const width = stroke.widthPt * SDM_POINT_TO_UNIT;
  const startMarker = stroke.startArrow && stroke.startArrow !== 'none';
  const endMarker = stroke.endArrow && stroke.endArrow !== 'none';
  let linecap: 'butt' | 'round' | 'square' = 'butt';
  if (stroke.cap === 'round') {
    linecap = 'round';
  } else if (stroke.cap === 'square') {
    linecap = 'square';
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${element.frame.width} ${element.frame.height}`}
      style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}
    >
      <defs>
        {startMarker ? (
          <LineMarker
            id={`${markerId}-start`}
            kind={stroke.startArrow ?? ''}
            color={color}
          />
        ) : null}
        {endMarker ? (
          <LineMarker
            id={`${markerId}-end`}
            kind={stroke.endArrow ?? ''}
            color={color}
          />
        ) : null}
      </defs>
      <polyline
        points={element.points.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={strokeDasharray(stroke.dash, width)}
        strokeLinecap={linecap}
        markerStart={startMarker ? `url(#${markerId}-start)` : undefined}
        markerEnd={endMarker ? `url(#${markerId}-end)` : undefined}
      />
    </svg>
  );
}

function CroppedImage({
  src,
  alt,
  element,
}: {
  src: string;
  alt: string;
  element: Extract<Element, { type: 'image' }>;
}) {
  const crop = element.crop;
  const hasCrop =
    crop &&
    (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0);
  if (!hasCrop) {
    return (
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        style={{
          width: '100%',
          height: '100%',
          objectFit: element.fit,
          display: 'block',
        }}
      />
    );
  }

  const visibleWidth = Math.max((100 - crop.left - crop.right) / 100, 0.01);
  const visibleHeight = Math.max((100 - crop.top - crop.bottom) / 100, 0.01);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        style={{
          position: 'absolute',
          width: `${100 / visibleWidth}%`,
          height: `${100 / visibleHeight}%`,
          maxWidth: 'none',
          maxHeight: 'none',
          left: `${-crop.left / visibleWidth}%`,
          top: `${-crop.top / visibleHeight}%`,
          display: 'block',
        }}
      />
    </div>
  );
}

function ElementInner({
  element,
  document,
  onAction,
}: {
  element: Element;
  document: SlideDocument;
  onAction?: (action: Action) => void;
}) {
  const { baseUrl } = useContext(SdmRenderContext);
  const theme = document.theme;
  const resolveAsset = (assetId: string) =>
    resolveAssetSrc(document.assets, assetId, baseUrl);
  switch (element.type) {
    case 'text': {
      const fill = element.fill
        ? paintToBackground(element.fill, theme, resolveAsset)
        : undefined;

      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            background: backgroundValue(fill),
            border: strokeToBorder(element.stroke, theme),
            boxSizing: 'border-box',
          }}
        >
          <PaintLayer resolved={fill} />
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <TextBodyView
              body={element.body}
              theme={theme}
              onAction={onAction}
            />
          </div>
        </div>
      );
    }
    case 'shape': {
      const shapePath = shapePathFor(
        element.geometry,
        element.frame.width,
        element.frame.height,
      );
      if (shapePath) {
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ShapeGeometryView
              shapePath={shapePath}
              fill={element.fill}
              stroke={element.stroke}
              theme={theme}
              resolveAsset={resolveAsset}
            />
            {element.body ? (
              <div style={{ position: 'absolute', inset: 0 }}>
                <TextBodyView
                  body={element.body}
                  theme={theme}
                  onAction={onAction}
                />
              </div>
            ) : null}
          </div>
        );
      }
      let radius: string | number | undefined;
      if (element.geometry.kind === 'preset') {
        if (element.geometry.preset === 'ellipse') {
          radius = '50%';
        } else if (element.geometry.preset === 'roundRect') {
          radius = element.geometry.cornerRadius ?? 20;
        }
      }
      const fill = paintToBackground(element.fill, theme, resolveAsset);

      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            background: backgroundValue(fill),
            border: strokeToBorder(element.stroke, theme),
            borderRadius: radius,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <PaintLayer resolved={fill} />
          {element.body ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <TextBodyView
                body={element.body}
                theme={theme}
                onAction={onAction}
              />
            </div>
          ) : null}
        </div>
      );
    }
    case 'image': {
      const src = resolveAsset(element.assetId);
      return src ? (
        <CroppedImage src={src} alt={element.altText ?? ''} element={element} />
      ) : null;
    }
    case 'line':
      return <LineView element={element} theme={theme} />;
    case 'group':
    case 'table':
    case 'widget':
      return null;
  }
}

export function SdmElementView({
  element,
  document,
  onAction,
}: {
  element: Element;
  document: SlideDocument;
  onAction?: (action: Action) => void;
}) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!element.action) {
      return;
    }
    event.stopPropagation();
    if (element.action.kind === 'openUrl') {
      const safeUrl = sanitizeActionUrl(element.action.url);
      if (safeUrl) {
        window.open(
          safeUrl,
          element.action.target === 'sameWindow' ? '_self' : '_blank',
          'noopener,noreferrer',
        );
      }
      return;
    }
    onAction?.(element.action);
  };

  return (
    <div
      data-sdm-id={element.id}
      data-sdm-type={element.type}
      data-sdm-action={
        element.action ? JSON.stringify(element.action) : undefined
      }
      style={{
        ...frameStyle(element),
        cursor: element.action ? 'pointer' : undefined,
      }}
      onClick={handleClick}
    >
      <ElementInner element={element} document={document} onAction={onAction} />
    </div>
  );
}
