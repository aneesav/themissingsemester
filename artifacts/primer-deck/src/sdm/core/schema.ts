import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const SDM_FORMAT = 'replit.sdm';
export const SDM_VERSION = 1;
export const SDM_SLIDE_WIDTH = 1920;
export const SDM_SLIDE_HEIGHT = 1080;
export const SDM_POINT_TO_UNIT = 2;

const strict = { additionalProperties: false } as const;
const finiteNumber = Type.Number();
const unitInterval = Type.Number({ minimum: 0, maximum: 1 });
const colorHex = Type.String({ pattern: '^#[0-9A-Fa-f]{6}$' });

/* Each embedding gets its own recursive instance with a distinct explicit $id:
 * a shared instance would emit the same $id twice in sdm.schema.json, which
 * JSON Schema resolvers may reject as a duplicate identifier. */
function jsonValueSchema($id: string) {
  return Type.Recursive(
    (Self) =>
      Type.Union([
        Type.Null(),
        Type.Boolean(),
        Type.Number(),
        Type.String(),
        Type.Array(Self),
        Type.Record(Type.String(), Self),
      ]),
    { $id },
  );
}

export const JsonValueSchema = jsonValueSchema('SdmJsonValue');

export const SizeSchema = Type.Object(
  {
    width: Type.Number({ exclusiveMinimum: 0 }),
    height: Type.Number({ exclusiveMinimum: 0 }),
  },
  strict,
);

export const FrameSchema = Type.Object(
  {
    x: finiteNumber,
    y: finiteNumber,
    width: Type.Number({ exclusiveMinimum: 0 }),
    height: Type.Number({ exclusiveMinimum: 0 }),
  },
  strict,
);

export const InsetsSchema = Type.Object(
  {
    top: Type.Number({ minimum: 0 }),
    right: Type.Number({ minimum: 0 }),
    bottom: Type.Number({ minimum: 0 }),
    left: Type.Number({ minimum: 0 }),
  },
  strict,
);

export const PointSchema = Type.Object(
  { x: finiteNumber, y: finiteNumber },
  strict,
);

export const ColorSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal('token'),
      token: Type.String({ minLength: 1 }),
    },
    strict,
  ),
  Type.Object(
    {
      kind: Type.Literal('rgb'),
      value: colorHex,
    },
    strict,
  ),
]);

export const FontSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal('token'),
      token: Type.String({ minLength: 1 }),
    },
    strict,
  ),
  Type.Object(
    {
      kind: Type.Literal('family'),
      family: Type.String({ minLength: 1 }),
    },
    strict,
  ),
]);

export const PaintSchema = Type.Union([
  Type.Object({ kind: Type.Literal('none') }, strict),
  Type.Object(
    {
      kind: Type.Literal('solid'),
      color: ColorSchema,
      opacity: Type.Optional(unitInterval),
    },
    strict,
  ),
  Type.Object(
    {
      kind: Type.Literal('linearGradient'),
      angleDeg: finiteNumber,
      stops: Type.Array(
        Type.Object(
          {
            offset: unitInterval,
            color: ColorSchema,
            opacity: Type.Optional(unitInterval),
          },
          strict,
        ),
        { minItems: 2 },
      ),
    },
    strict,
  ),
  Type.Object(
    {
      kind: Type.Literal('image'),
      assetId: Type.String({ minLength: 1 }),
      fit: Type.Union([
        Type.Literal('cover'),
        Type.Literal('contain'),
        Type.Literal('fill'),
      ]),
      opacity: Type.Optional(unitInterval),
    },
    strict,
  ),
]);

export const StrokeSchema = Type.Object(
  {
    color: ColorSchema,
    widthPt: Type.Number({ minimum: 0 }),
    opacity: Type.Optional(unitInterval),
    dash: Type.Optional(
      Type.Union([
        Type.Literal('solid'),
        Type.Literal('dash'),
        Type.Literal('dot'),
      ]),
    ),
    cap: Type.Optional(
      Type.Union([
        Type.Literal('flat'),
        Type.Literal('round'),
        Type.Literal('square'),
      ]),
    ),
    startArrow: Type.Optional(
      Type.Union([
        Type.Literal('none'),
        Type.Literal('triangle'),
        Type.Literal('stealth'),
        Type.Literal('diamond'),
        Type.Literal('oval'),
      ]),
    ),
    endArrow: Type.Optional(
      Type.Union([
        Type.Literal('none'),
        Type.Literal('triangle'),
        Type.Literal('stealth'),
        Type.Literal('diamond'),
        Type.Literal('oval'),
      ]),
    ),
  },
  strict,
);

export const ActionSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal('openUrl'),
      url: Type.String({ minLength: 1 }),
      tooltip: Type.Optional(Type.String()),
      target: Type.Optional(
        Type.Union([Type.Literal('sameWindow'), Type.Literal('newWindow')]),
      ),
    },
    strict,
  ),
  Type.Object(
    {
      kind: Type.Literal('goToSlide'),
      slideId: Type.String({ minLength: 1 }),
      tooltip: Type.Optional(Type.String()),
    },
    strict,
  ),
  Type.Object(
    {
      kind: Type.Literal('goToRelativeSlide'),
      target: Type.Union([
        Type.Literal('next'),
        Type.Literal('previous'),
        Type.Literal('first'),
        Type.Literal('last'),
      ]),
      tooltip: Type.Optional(Type.String()),
    },
    strict,
  ),
]);

export const TextRunSchema = Type.Object(
  {
    text: Type.String(),
    font: Type.Optional(FontSchema),
    sizePt: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    weight: Type.Optional(Type.Integer({ minimum: 100, maximum: 900 })),
    italic: Type.Optional(Type.Boolean()),
    underline: Type.Optional(Type.Boolean()),
    strike: Type.Optional(Type.Boolean()),
    color: Type.Optional(ColorSchema),
    highlight: Type.Optional(ColorSchema),
    letterSpacingPt: Type.Optional(finiteNumber),
    action: Type.Optional(ActionSchema),
  },
  strict,
);

export const ParagraphSchema = Type.Object(
  {
    runs: Type.Array(TextRunSchema),
    align: Type.Optional(
      Type.Union([
        Type.Literal('left'),
        Type.Literal('center'),
        Type.Literal('right'),
        Type.Literal('justify'),
      ]),
    ),
    level: Type.Optional(Type.Integer({ minimum: 0, maximum: 8 })),
    bullet: Type.Optional(
      Type.Union([
        Type.Object({ kind: Type.Literal('none') }, strict),
        Type.Object(
          { kind: Type.Literal('character'), character: Type.String() },
          strict,
        ),
        Type.Object(
          {
            kind: Type.Literal('number'),
            style: Type.Optional(Type.String()),
            startAt: Type.Optional(Type.Integer({ minimum: 1 })),
          },
          strict,
        ),
      ]),
    ),
    lineHeight: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    spaceBeforePt: Type.Optional(Type.Number({ minimum: 0 })),
    spaceAfterPt: Type.Optional(Type.Number({ minimum: 0 })),
  },
  strict,
);

export const TextBodySchema = Type.Object(
  {
    paragraphs: Type.Array(ParagraphSchema),
    verticalAlign: Type.Optional(
      Type.Union([
        Type.Literal('top'),
        Type.Literal('middle'),
        Type.Literal('bottom'),
      ]),
    ),
    autofit: Type.Optional(
      Type.Union([
        Type.Literal('none'),
        Type.Literal('shrink'),
        Type.Literal('resize'),
      ]),
    ),
    overflow: Type.Optional(
      Type.Union([Type.Literal('clip'), Type.Literal('visible')]),
    ),
    insetsPt: Type.Optional(InsetsSchema),
  },
  strict,
);

export const GeometrySchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal('preset'),
      preset: Type.String({ minLength: 1 }),
      cornerRadius: Type.Optional(Type.Number({ minimum: 0 })),
      adjustments: Type.Optional(Type.Record(Type.String(), finiteNumber)),
    },
    strict,
  ),
  Type.Object(
    {
      kind: Type.Literal('path'),
      viewBox: SizeSchema,
      path: Type.String({ minLength: 1 }),
    },
    strict,
  ),
]);

const elementBase = {
  id: Type.String({ minLength: 1, pattern: '^[A-Za-z][A-Za-z0-9_-]*$' }),
  name: Type.Optional(Type.String()),
  frame: FrameSchema,
  rotationDeg: Type.Optional(finiteNumber),
  flipH: Type.Optional(Type.Boolean()),
  flipV: Type.Optional(Type.Boolean()),
  opacity: Type.Optional(unitInterval),
  hidden: Type.Optional(Type.Boolean()),
  locked: Type.Optional(Type.Boolean()),
  altText: Type.Optional(Type.String()),
  action: Type.Optional(ActionSchema),
};

export const ElementSchema = Type.Recursive(
  (Element) =>
    Type.Union([
      Type.Object(
        {
          ...elementBase,
          type: Type.Literal('text'),
          body: TextBodySchema,
          fill: Type.Optional(PaintSchema),
          stroke: Type.Optional(StrokeSchema),
        },
        strict,
      ),
      Type.Object(
        {
          ...elementBase,
          type: Type.Literal('shape'),
          geometry: GeometrySchema,
          fill: PaintSchema,
          stroke: Type.Optional(StrokeSchema),
          body: Type.Optional(TextBodySchema),
        },
        strict,
      ),
      Type.Object(
        {
          ...elementBase,
          type: Type.Literal('image'),
          assetId: Type.String({ minLength: 1 }),
          fit: Type.Union([
            Type.Literal('cover'),
            Type.Literal('contain'),
            Type.Literal('fill'),
          ]),
          crop: Type.Optional(InsetsSchema),
        },
        strict,
      ),
      Type.Object(
        {
          ...elementBase,
          type: Type.Literal('line'),
          points: Type.Array(PointSchema, { minItems: 2 }),
          stroke: StrokeSchema,
        },
        strict,
      ),
      Type.Object(
        {
          ...elementBase,
          type: Type.Literal('group'),
          coordinateSpace: SizeSchema,
          children: Type.Array(Element),
          clip: Type.Optional(Type.Boolean()),
        },
        strict,
      ),
      Type.Object(
        {
          ...elementBase,
          type: Type.Literal('table'),
          columns: Type.Array(
            Type.Object(
              { width: Type.Number({ exclusiveMinimum: 0 }) },
              strict,
            ),
            { minItems: 1 },
          ),
          rows: Type.Array(
            Type.Object(
              {
                height: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
                cells: Type.Array(
                  Type.Object(
                    {
                      body: TextBodySchema,
                      fill: Type.Optional(PaintSchema),
                      colSpan: Type.Optional(Type.Integer({ minimum: 1 })),
                      rowSpan: Type.Optional(Type.Integer({ minimum: 1 })),
                    },
                    strict,
                  ),
                ),
              },
              strict,
            ),
          ),
        },
        strict,
      ),
      Type.Object(
        {
          ...elementBase,
          type: Type.Literal('widget'),
          widget: Type.Object(
            {
              module: Type.String({
                pattern: '^\\./widgets/[A-Za-z0-9_/-]+\\.tsx$',
              }),
              exportName: Type.Optional(Type.String({ minLength: 1 })),
              props: Type.Optional(
                Type.Record(
                  Type.String(),
                  jsonValueSchema('SdmWidgetPropValue'),
                ),
              ),
              sizing: Type.Optional(Type.Literal('fill')),
              export: Type.Optional(
                Type.Object(
                  {
                    mode: Type.Union([
                      Type.Literal('snapshot'),
                      Type.Literal('svg'),
                    ]),
                  },
                  strict,
                ),
              ),
            },
            strict,
          ),
        },
        strict,
      ),
    ]),
  { $id: 'SdmElement' },
);

export const AssetSchema = Type.Object(
  {
    src: Type.String({ minLength: 1 }),
    mimeType: Type.Optional(Type.String()),
    width: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    height: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    sha256: Type.Optional(Type.String()),
  },
  strict,
);

export const ThemeSchema = Type.Object(
  {
    colors: Type.Record(Type.String(), colorHex),
    fonts: Type.Record(Type.String(), Type.String({ minLength: 1 })),
  },
  strict,
);

export const SlideDocumentSchema = Type.Object(
  {
    $schema: Type.Optional(Type.String()),
    format: Type.Literal(SDM_FORMAT),
    version: Type.Literal(SDM_VERSION),
    size: SizeSchema,
    background: PaintSchema,
    theme: Type.Optional(ThemeSchema),
    assets: Type.Optional(Type.Record(Type.String(), AssetSchema)),
    elements: Type.Array(ElementSchema),
    extensions: Type.Optional(Type.Record(Type.String(), JsonValueSchema)),
  },
  strict,
);

export type JsonValue = Static<typeof JsonValueSchema>;
export type Size = Static<typeof SizeSchema>;
export type Frame = Static<typeof FrameSchema>;
export type Insets = Static<typeof InsetsSchema>;
export type Point = Static<typeof PointSchema>;
export type Color = Static<typeof ColorSchema>;
export type Font = Static<typeof FontSchema>;
export type Paint = Static<typeof PaintSchema>;
export type Stroke = Static<typeof StrokeSchema>;
export type Action = Static<typeof ActionSchema>;
export type TextRun = Static<typeof TextRunSchema>;
export type Paragraph = Static<typeof ParagraphSchema>;
export type TextBody = Static<typeof TextBodySchema>;
export type Geometry = Static<typeof GeometrySchema>;
export type Element = Static<typeof ElementSchema>;
export type Asset = Static<typeof AssetSchema>;
export type Theme = Static<typeof ThemeSchema>;
export type SlideDocument = Static<typeof SlideDocumentSchema>;

export type SdmIssue = {
  path: string;
  message: string;
};

export type ParseSlideDocumentResult =
  | { ok: true; document: SlideDocument }
  | { ok: false; reason: 'invalid'; issues: Array<SdmIssue> }
  | { ok: false; reason: 'unsupportedVersion'; version: number };

export function isSlideDocument(input: unknown): input is SlideDocument {
  return Value.Check(SlideDocumentSchema, input);
}

function probeUnsupportedVersion(input: unknown): number | undefined {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return undefined;
  }
  const candidate = input as Record<string, unknown>;
  if (candidate.format !== SDM_FORMAT) {
    return undefined;
  }
  return typeof candidate.version === 'number' &&
    candidate.version > SDM_VERSION
    ? candidate.version
    : undefined;
}

function collectPaintIssues(
  paint: Paint | undefined,
  path: string,
  assets: Record<string, Asset>,
  issues: Array<SdmIssue>,
): void {
  if (paint?.kind === 'image' && !Object.hasOwn(assets, paint.assetId)) {
    issues.push({
      path,
      message: `references missing asset "${paint.assetId}"`,
    });
  }
}

function collectSemanticIssues(document: SlideDocument): Array<SdmIssue> {
  const issues: Array<SdmIssue> = [];
  const assets = document.assets ?? {};
  const seenIds = new Set<string>();

  collectPaintIssues(document.background, '/background', assets, issues);

  const visit = (elements: Array<Element>, basePath: string) => {
    elements.forEach((element, index) => {
      const path = `${basePath}/${index}`;
      if (seenIds.has(element.id)) {
        issues.push({
          path: `${path}/id`,
          message: `duplicate element id "${element.id}"`,
        });
      }
      seenIds.add(element.id);

      switch (element.type) {
        case 'text':
        case 'shape':
          collectPaintIssues(element.fill, `${path}/fill`, assets, issues);
          break;
        case 'image':
          if (!Object.hasOwn(assets, element.assetId)) {
            issues.push({
              path: `${path}/assetId`,
              message: `missing asset "${element.assetId}"`,
            });
          }
          break;
        case 'table':
          element.rows.forEach((row, rowIndex) => {
            row.cells.forEach((cell, cellIndex) => {
              collectPaintIssues(
                cell.fill,
                `${path}/rows/${rowIndex}/cells/${cellIndex}/fill`,
                assets,
                issues,
              );
            });
          });
          break;
        case 'group':
          visit(element.children, `${path}/children`);
          break;
        case 'line':
        case 'widget':
          break;
      }
    });
  };
  visit(document.elements, '/elements');

  return issues;
}

export function parseSlideDocument(input: unknown): ParseSlideDocumentResult {
  const futureVersion = probeUnsupportedVersion(input);
  if (futureVersion !== undefined) {
    return { ok: false, reason: 'unsupportedVersion', version: futureVersion };
  }

  if (!isSlideDocument(input)) {
    const issues = [...Value.Errors(SlideDocumentSchema, input)].map(
      (error) => ({
        path: error.path || '/',
        message: error.message,
      }),
    );
    return { ok: false, reason: 'invalid', issues };
  }

  const issues = collectSemanticIssues(input);
  if (issues.length > 0) {
    return { ok: false, reason: 'invalid', issues };
  }

  return { ok: true, document: input };
}
