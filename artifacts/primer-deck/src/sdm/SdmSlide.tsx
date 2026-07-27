import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  parseSlideDocument,
  type Action,
  type ParseSlideDocumentResult,
  type SlideDocument,
} from './core/schema';
import {
  backgroundValue,
  PaintLayer,
  SdmElementView,
  SdmRenderContext,
} from './render';
import { resolveAssetSrc, paintToBackground } from './style';
import { SDM_BASE_URL } from './sdmRuntime';

interface Props {
  slideId: string;
  initialDocument: unknown;
}

interface ParsedState {
  document: SlideDocument | null;
  error: string | null;
}

function describeParseFailure(
  result: Exclude<ParseSlideDocumentResult, { ok: true }>,
): string {
  if (result.reason === 'unsupportedVersion') {
    return `document version ${result.version} is newer than this runtime supports`;
  }

  return result.issues
    .slice(0, 8)
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join('; ');
}

function tryParse(input: unknown): ParsedState {
  const result = parseSlideDocument(input);
  if (result.ok) {
    return { document: result.document, error: null };
  }

  return { document: null, error: describeParseFailure(result) };
}

function useStageScale(
  rootRef: RefObject<HTMLDivElement | null>,
  size: { width: number; height: number },
): number {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const update = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (w > 0 && h > 0) {
        setScale(Math.min(w / size.width, h / size.height));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);

    return () => observer.disconnect();
  }, [rootRef, size.height, size.width]);

  return scale;
}

export function SdmSlide({ slideId, initialDocument }: Props) {
  const [state, setState] = useState<ParsedState>(() =>
    tryParse(initialDocument),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const document = state.document;
  const size = document?.size ?? { width: 1920, height: 1080 };
  const scale = useStageScale(rootRef, size);

  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) {
      return;
    }
    const handler = (data: { slideId?: string; document?: unknown }) => {
      if (data?.slideId !== slideId || !data.document) {
        return;
      }
      setState(tryParse(data.document));
    };
    hot.on('sdm:documentChanged', handler);

    return () => hot.off('sdm:documentChanged', handler);
  }, [slideId]);

  const handleAction = useCallback((action: Action) => {
    window.postMessage({ type: 'sdm:action', action }, '*');
  }, []);

  const renderContext = useMemo(
    () => ({ baseUrl: SDM_BASE_URL, widgets: {} }),
    [],
  );

  const background = document
    ? paintToBackground(document.background, document.theme, (assetId) =>
        resolveAssetSrc(document.assets, assetId, SDM_BASE_URL),
      )
    : undefined;
  const stageBackground = document
    ? (backgroundValue(background) ?? '#ffffff')
    : '#1a1a1a';

  return (
    <SdmRenderContext.Provider value={renderContext}>
      <div
        ref={rootRef}
        className="relative w-screen h-screen overflow-hidden"
        style={{ background: stageBackground }}
        data-sdm-slide-id={slideId}
        data-sdm-ready="true"
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size.width,
            height: size.height,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center center',
            background: stageBackground,
            overflow: 'hidden',
          }}
        >
          <PaintLayer resolved={background} />
          {document?.elements.map((element) => (
            <SdmElementView
              key={element.id}
              element={element}
              document={document}
              onAction={handleAction}
            />
          ))}
        </div>

        {state.error ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              color: '#fca5a5',
              fontFamily: 'monospace',
              fontSize: 16,
              textAlign: 'center',
            }}
          >
            Invalid SDM slide “{slideId}”: {state.error}
          </div>
        ) : null}
      </div>
    </SdmRenderContext.Provider>
  );
}
