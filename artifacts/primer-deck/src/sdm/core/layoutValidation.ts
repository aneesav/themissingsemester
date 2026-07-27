import {
  SDM_SLIDE_HEIGHT,
  SDM_SLIDE_WIDTH,
  type Element,
  type Frame,
  type Paragraph,
  type SlideDocument,
  type TextBody,
  type TextRun,
} from './schema';

export type SdmLayoutIssueCode =
  | 'canvas-size'
  | 'table-span'
  | 'text-autofit'
  | 'text-autofit-resize'
  | 'text-out-of-bounds'
  | 'text-overlap';

export interface SdmLayoutIssue {
  code: SdmLayoutIssueCode;
  elementIds: Array<string>;
  message: string;
}

interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

interface TextOwner {
  id: string;
  frame: Frame;
  body: TextBody;
  transform: Transform;
  hidden: boolean;
  transformed: boolean;
  clip: Frame | undefined;
}

interface Line {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextLayout {
  lines: Array<Line>;
  height: number;
  longestToken: number;
  availableWidth: number;
  availableHeight: number;
}

interface ParagraphLayout {
  lines: Array<Line>;
  longestToken: number;
}

interface OwnerLayout {
  owner: TextOwner;
  fit: number;
  fitsAtMinimum: boolean;
  lines: Array<Line>;
}

const MIN_AUTOFIT = 0.3;
const MIN_ACCEPTABLE_FIT = 0.9;
const DEFAULT_SIZE_PT = 18;

export function analyzeSlideLayout(
  document: SlideDocument,
): Array<SdmLayoutIssue> {
  const issues: Array<SdmLayoutIssue> = [];
  if (
    document.size.width !== SDM_SLIDE_WIDTH ||
    document.size.height !== SDM_SLIDE_HEIGHT
  ) {
    issues.push({
      code: 'canvas-size',
      elementIds: [],
      message: `SDM canvas must be ${SDM_SLIDE_WIDTH}x${SDM_SLIDE_HEIGHT}; found ${document.size.width}x${document.size.height}.`,
    });
  }

  const owners: Array<TextOwner> = [];
  collectTextOwners(
    document.elements,
    identityTransform(),
    false,
    false,
    undefined,
    owners,
    issues,
  );
  const layouts = owners
    .filter((owner) => !owner.hidden)
    .map((owner) => layoutOwner(owner));
  const canvas: Frame = {
    x: 0,
    y: 0,
    width: document.size.width,
    height: document.size.height,
  };
  const visibleRect = (owner: TextOwner) =>
    owner.clip ? intersectRects(canvas, owner.clip) : canvas;

  for (const layout of layouts) {
    const { owner, fit, fitsAtMinimum } = layout;
    if (!fitsAtMinimum || fit < MIN_ACCEPTABLE_FIT) {
      if (owner.body.autofit === 'resize') {
        issues.push({
          code: 'text-autofit-resize',
          elementIds: [owner.id],
          message: `Text element "${owner.id}" uses autofit "resize", which rendering does not implement — the ${Math.round(owner.frame.width)}x${Math.round(owner.frame.height)} frame will not grow. Increase the frame, shorten the copy, or switch to shrink autofit.`,
        });
      } else {
        const percent = Math.round(fit * 100);
        const minimumSize =
          Math.round(minimumRunSize(owner.body) * fit * 10) / 10;
        let message = `Text element "${owner.id}" needs about ${percent}% autofit, reducing its smallest run to about ${minimumSize}pt. Keep at least 90% by increasing the frame, widening it, or shortening the copy.`;
        if (owner.body.autofit === 'none') {
          message = `Text element "${owner.id}" does not fit its ${Math.round(owner.frame.width)}x${Math.round(owner.frame.height)} frame with autofit disabled. Increase the frame, shorten the copy, or enable shrink autofit.`;
        } else if (!fitsAtMinimum) {
          message = `Text element "${owner.id}" does not fit its ${Math.round(owner.frame.width)}x${Math.round(owner.frame.height)} frame even at minimum autofit. Increase the frame, shorten the copy, or split the slide.`;
        }
        issues.push({
          code: 'text-autofit',
          elementIds: [owner.id],
          message,
        });
      }
    }

    if (!owner.transformed) {
      const visible = visibleRect(owner);
      const outside = layout.lines.some(
        (line) =>
          line.x < visible.x - 2 ||
          line.y < visible.y - 2 ||
          line.x + line.width > visible.x + visible.width + 2 ||
          line.y + line.height > visible.y + visible.height + 2,
      );
      if (outside) {
        issues.push({
          code: 'text-out-of-bounds',
          elementIds: [owner.id],
          message: owner.clip
            ? `Text element "${owner.id}" extends outside its clipping group's visible region. Move or resize it so every line stays within the clipped area.`
            : `Text element "${owner.id}" extends outside the ${document.size.width}x${document.size.height} canvas. Move or resize its frame so every line remains visible.`,
        });
      }
    }
  }

  for (let leftIndex = 0; leftIndex < layouts.length; leftIndex += 1) {
    const left = layouts[leftIndex];
    if (left.owner.transformed) {
      continue;
    }
    const leftLines = clipLines(left.lines, visibleRect(left.owner));
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < layouts.length;
      rightIndex += 1
    ) {
      const right = layouts[rightIndex];
      const rightLines = clipLines(right.lines, visibleRect(right.owner));
      if (right.owner.transformed || !linesOverlap(leftLines, rightLines)) {
        continue;
      }
      issues.push({
        code: 'text-overlap',
        elementIds: [left.owner.id, right.owner.id],
        message: `Text elements "${left.owner.id}" and "${right.owner.id}" overlap. Move or resize their frames so the rendered lines do not intersect.`,
      });
    }
  }

  return issues;
}

function identityTransform(): Transform {
  return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
}

function intersectRects(left: Frame, right: Frame): Frame {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);

  return {
    x,
    y,
    width: Math.min(left.x + left.width, right.x + right.width) - x,
    height: Math.min(left.y + left.height, right.y + right.height) - y,
  };
}

function clipLines(lines: Array<Line>, clip: Frame | undefined): Array<Line> {
  if (!clip) {
    return lines;
  }

  return lines.flatMap((line) => {
    const visible = intersectRects(line, clip);

    return visible.width > 0 && visible.height > 0 ? [visible] : [];
  });
}

function collectTextOwners(
  elements: Array<Element>,
  transform: Transform,
  parentHidden: boolean,
  parentTransformed: boolean,
  clip: Frame | undefined,
  owners: Array<TextOwner>,
  issues: Array<SdmLayoutIssue>,
): void {
  for (const element of elements) {
    const hidden =
      parentHidden || element.hidden === true || element.opacity === 0;
    const transformed =
      parentTransformed ||
      (element.rotationDeg ?? 0) !== 0 ||
      element.flipH === true ||
      element.flipV === true;
    if (element.type === 'text') {
      owners.push({
        id: element.id,
        frame: element.frame,
        body: element.body,
        transform,
        hidden,
        transformed,
        clip,
      });
    } else if (element.type === 'shape' && element.body) {
      owners.push({
        id: element.id,
        frame: element.frame,
        body: element.body,
        transform,
        hidden,
        transformed,
        clip,
      });
    } else if (element.type === 'group') {
      const groupTransform: Transform = {
        x: transform.x + element.frame.x * transform.scaleX,
        y: transform.y + element.frame.y * transform.scaleY,
        scaleX:
          transform.scaleX *
          (element.frame.width / element.coordinateSpace.width),
        scaleY:
          transform.scaleY *
          (element.frame.height / element.coordinateSpace.height),
      };
      let childClip = clip;
      if (element.clip) {
        const groupRect: Frame = {
          x: groupTransform.x,
          y: groupTransform.y,
          width: element.frame.width * transform.scaleX,
          height: element.frame.height * transform.scaleY,
        };
        childClip = childClip
          ? intersectRects(childClip, groupRect)
          : groupRect;
      }
      collectTextOwners(
        element.children,
        groupTransform,
        hidden,
        transformed,
        childClip,
        owners,
        issues,
      );
    } else if (element.type === 'table') {
      collectTableCells(
        element,
        transform,
        hidden,
        transformed,
        clip,
        owners,
        issues,
      );
    }
  }
}

function collectTableCells(
  table: Extract<Element, { type: 'table' }>,
  transform: Transform,
  hidden: boolean,
  transformed: boolean,
  clip: Frame | undefined,
  owners: Array<TextOwner>,
  issues: Array<SdmLayoutIssue>,
): void {
  if (table.rows.length === 0 || table.columns.length === 0) {
    return;
  }
  const columnWeights = table.columns.map((column) => column.width);
  const columnWidths = normalizeSizes(columnWeights, table.frame.width);
  const rowWeights = table.rows.map(
    (row) => row.height ?? table.frame.height / table.rows.length,
  );
  const rowHeights = normalizeSizes(rowWeights, table.frame.height);
  const columnOffsets = cumulativeOffsets(columnWidths, table.frame.x);
  const rowOffsets = cumulativeOffsets(rowHeights, table.frame.y);
  const occupied = table.rows.map(() => table.columns.map(() => false));

  table.rows.forEach((row, rowIndex) => {
    let columnIndex = 0;
    row.cells.forEach((cell, cellIndex) => {
      const cellId = `${table.id}:r${rowIndex}c${cellIndex}`;
      while (
        columnIndex < table.columns.length &&
        occupied[rowIndex][columnIndex]
      ) {
        columnIndex += 1;
      }
      if (columnIndex >= table.columns.length) {
        if (!hidden) {
          issues.push({
            code: 'table-span',
            elementIds: [cellId],
            message: `Table "${table.id}" row ${rowIndex} declares more cells or spans than its ${table.columns.length} columns; cell ${cellId} has no free column. Remove the cell or reduce the spans in this row.`,
          });
        }
        return;
      }
      const declaredColSpan = cell.colSpan ?? 1;
      const declaredRowSpan = cell.rowSpan ?? 1;
      let colSpan = 1;
      while (
        colSpan < declaredColSpan &&
        columnIndex + colSpan < table.columns.length &&
        !occupied[rowIndex][columnIndex + colSpan]
      ) {
        colSpan += 1;
      }
      const rowIsFree = (row: number) => {
        for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
          if (occupied[row][columnIndex + columnOffset]) {
            return false;
          }
        }
        return true;
      };
      let rowSpan = 1;
      while (
        rowSpan < declaredRowSpan &&
        rowIndex + rowSpan < table.rows.length &&
        rowIsFree(rowIndex + rowSpan)
      ) {
        rowSpan += 1;
      }
      if (!hidden && colSpan < declaredColSpan) {
        issues.push({
          code: 'table-span',
          elementIds: [cellId],
          message: `Table "${table.id}" cell ${cellId} declares colSpan ${declaredColSpan} but only ${colSpan} columns are free. Reduce the overlapping spans or add columns.`,
        });
      }
      if (!hidden && rowSpan < declaredRowSpan) {
        issues.push({
          code: 'table-span',
          elementIds: [cellId],
          message: `Table "${table.id}" cell ${cellId} declares rowSpan ${declaredRowSpan} but only ${rowSpan} rows are free. Reduce the overlapping spans or add rows.`,
        });
      }
      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
          occupied[rowIndex + rowOffset][columnIndex + columnOffset] = true;
        }
      }
      owners.push({
        id: cellId,
        frame: {
          x: columnOffsets[columnIndex],
          y: rowOffsets[rowIndex],
          width:
            columnOffsets[columnIndex + colSpan] - columnOffsets[columnIndex],
          height: rowOffsets[rowIndex + rowSpan] - rowOffsets[rowIndex],
        },
        body: cell.body,
        transform,
        hidden,
        transformed,
        clip,
      });
      columnIndex += colSpan;
    });
  });
}

function normalizeSizes(
  weights: Array<number>,
  available: number,
): Array<number> {
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map((weight) => (weight / total) * available);
}

function cumulativeOffsets(sizes: Array<number>, start: number): Array<number> {
  const offsets = [start];
  for (const size of sizes) {
    offsets.push(offsets[offsets.length - 1] + size);
  }

  return offsets;
}

function layoutOwner(owner: TextOwner): OwnerLayout {
  const atOne = layoutText(owner.body, owner.frame, 1);
  if (layoutFits(atOne)) {
    return {
      owner,
      fit: 1,
      fitsAtMinimum: true,
      lines: transformLines(atOne.lines, owner.transform),
    };
  }
  if (owner.body.autofit === 'none' || owner.body.autofit === 'resize') {
    return {
      owner,
      fit: 1,
      fitsAtMinimum: false,
      lines: transformLines(atOne.lines, owner.transform),
    };
  }

  const atMinimum = layoutText(owner.body, owner.frame, MIN_AUTOFIT);
  if (!layoutFits(atMinimum)) {
    return {
      owner,
      fit: MIN_AUTOFIT,
      fitsAtMinimum: false,
      lines: transformLines(atMinimum.lines, owner.transform),
    };
  }

  let low = MIN_AUTOFIT;
  let high = 1;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const middle = (low + high) / 2;
    if (layoutFits(layoutText(owner.body, owner.frame, middle))) {
      low = middle;
    } else {
      high = middle;
    }
  }
  const fitted = layoutText(owner.body, owner.frame, low);

  return {
    owner,
    fit: low,
    fitsAtMinimum: true,
    lines: transformLines(fitted.lines, owner.transform),
  };
}

function layoutText(body: TextBody, frame: Frame, scale: number): TextLayout {
  const insets = body.insetsPt ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const left = frame.x + insets.left * 2;
  const top = frame.y + insets.top * 2;
  const availableWidth = Math.max(
    1,
    frame.width - (insets.left + insets.right) * 2,
  );
  const availableHeight = Math.max(
    1,
    frame.height - (insets.top + insets.bottom) * 2,
  );
  const lines: Array<Line> = [];
  let cursorY = 0;
  let longestToken = 0;

  for (const paragraph of body.paragraphs) {
    cursorY += (paragraph.spaceBeforePt ?? 0) * 2 * scale;
    const paragraphLines = layoutParagraph(paragraph, availableWidth, scale);
    longestToken = Math.max(longestToken, paragraphLines.longestToken);
    for (const line of paragraphLines.lines) {
      const align = paragraph.align ?? 'left';
      let lineX = 0;
      if (align === 'center') {
        lineX = (availableWidth - line.width) / 2;
      } else if (align === 'right') {
        lineX = availableWidth - line.width;
      }
      lines.push({ ...line, x: left + lineX, y: top + cursorY });
      cursorY += line.height;
    }
    cursorY += (paragraph.spaceAfterPt ?? 0) * 2 * scale;
  }

  const verticalSlack = Math.max(0, availableHeight - cursorY);
  let verticalOffset = 0;
  if (body.verticalAlign === 'middle') {
    verticalOffset = verticalSlack / 2;
  } else if (body.verticalAlign === 'bottom') {
    verticalOffset = verticalSlack;
  }
  if (verticalOffset > 0) {
    for (const line of lines) {
      line.y += verticalOffset;
    }
  }

  return {
    lines,
    height: cursorY,
    longestToken,
    availableWidth,
    availableHeight,
  };
}

function layoutParagraph(
  paragraph: Paragraph,
  availableWidth: number,
  scale: number,
): ParagraphLayout {
  const lineHeightMultiplier = paragraph.lineHeight ?? 1.2;
  const lines: Array<Line> = [];
  let lineWidth = 0;
  let trailingWhitespace = 0;
  let lineHeight = defaultLineHeight(paragraph, scale);
  let longestToken = 0;

  const finishLine = () => {
    lines.push({
      x: 0,
      y: 0,
      width: lineWidth - trailingWhitespace,
      height: lineHeight,
    });
    lineWidth = 0;
    trailingWhitespace = 0;
    lineHeight = defaultLineHeight(paragraph, scale);
  };

  /* Adjacent styled runs render as one unbreakable word unless whitespace
   * separates them, so word fragments merge across run boundaries. */
  const tokens: Array<Token> = [];
  for (const run of paragraph.runs) {
    for (const token of tokenizeRun(run, lineHeightMultiplier, scale)) {
      const previous = tokens[tokens.length - 1];
      if (
        previous &&
        !previous.whitespace &&
        !previous.newline &&
        !token.whitespace &&
        !token.newline
      ) {
        previous.text += token.text;
        previous.width += token.width;
        previous.height = Math.max(previous.height, token.height);
      } else {
        tokens.push(token);
      }
    }
  }
  if (paragraph.bullet && paragraph.bullet.kind !== 'none') {
    const run = paragraph.runs[0] ?? { text: '', sizePt: DEFAULT_SIZE_PT };
    const marker =
      paragraph.bullet.kind === 'character'
        ? `${paragraph.bullet.character} `
        : `${paragraph.bullet.startAt ?? 1}. `;
    tokens.unshift({
      text: marker,
      width: textWidth(marker, run, scale),
      height: runHeight(run, lineHeightMultiplier, scale),
      whitespace: false,
      newline: false,
    });
  }

  for (const token of tokens) {
    if (token.newline) {
      finishLine();
      continue;
    }
    if (token.whitespace) {
      if (lineWidth === 0) {
        continue;
      }
      lineWidth += token.width;
      trailingWhitespace += token.width;
      lineHeight = Math.max(lineHeight, token.height);
      continue;
    }
    longestToken = Math.max(longestToken, token.width);
    if (lineWidth > 0 && lineWidth + token.width > availableWidth) {
      finishLine();
    }
    lineWidth += token.width;
    trailingWhitespace = 0;
    lineHeight = Math.max(lineHeight, token.height);
  }
  if (lineWidth > 0 || lines.length === 0) {
    finishLine();
  }

  return {
    lines,
    longestToken,
  };
}

interface Token {
  text: string;
  width: number;
  height: number;
  whitespace: boolean;
  newline: boolean;
}

function tokenizeRun(
  run: TextRun,
  lineHeight: number,
  scale: number,
): Array<Token> {
  const parts = run.text.split(/(\n|[\t ]+)/).filter(Boolean);

  return parts.map((text) => ({
    text,
    width: text === '\n' ? 0 : textWidth(text, run, scale),
    height: runHeight(run, lineHeight, scale),
    whitespace: /^[\t ]+$/.test(text),
    newline: text === '\n',
  }));
}

function textWidth(text: string, run: TextRun, scale: number): number {
  const size = (run.sizePt ?? DEFAULT_SIZE_PT) * 2 * scale;
  const glyphs = Array.from(text);
  const ems = glyphs.reduce((sum, glyph) => sum + glyphWidth(glyph), 0);
  const spacing = (run.letterSpacingPt ?? 0) * 2 * scale;

  return ems * size + glyphs.length * spacing;
}

function glyphWidth(glyph: string): number {
  if (/\s/.test(glyph)) {
    return 0.33;
  }
  if (/[ilI.,'`:;|!]/.test(glyph)) {
    return 0.3;
  }
  if (/[MW@#%&]/.test(glyph)) {
    return 0.9;
  }
  if ((glyph.codePointAt(0) ?? 0) >= 0x2e80) {
    return 1;
  }
  if (/[A-Z0-9]/.test(glyph)) {
    return 0.62;
  }
  return 0.55;
}

function runHeight(run: TextRun, lineHeight: number, scale: number): number {
  return (run.sizePt ?? DEFAULT_SIZE_PT) * 2 * lineHeight * scale;
}

function defaultLineHeight(paragraph: Paragraph, scale: number): number {
  const largest = paragraph.runs.reduce(
    (size, run) => Math.max(size, run.sizePt ?? DEFAULT_SIZE_PT),
    DEFAULT_SIZE_PT,
  );

  return largest * 2 * (paragraph.lineHeight ?? 1.2) * scale;
}

function layoutFits(layout: TextLayout): boolean {
  return (
    layout.longestToken <= layout.availableWidth &&
    layout.lines.every((line) => line.width <= layout.availableWidth) &&
    layout.height <= layout.availableHeight
  );
}

function transformLines(lines: Array<Line>, transform: Transform): Array<Line> {
  return lines.map((line) => ({
    x: transform.x + line.x * transform.scaleX,
    y: transform.y + line.y * transform.scaleY,
    width: line.width * transform.scaleX,
    height: line.height * transform.scaleY,
  }));
}

function linesOverlap(left: Array<Line>, right: Array<Line>): boolean {
  return left.some((a) =>
    right.some((b) => {
      const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const height =
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (width <= 4 || height <= 4) {
        return false;
      }
      const intersection = width * height;
      const smaller = Math.min(a.width * a.height, b.width * b.height);

      return smaller > 0 && intersection / smaller > 0.05;
    }),
  );
}

function minimumRunSize(body: TextBody): number {
  const sizes = body.paragraphs.flatMap((paragraph) =>
    paragraph.runs
      .filter((run) => run.text.trim().length > 0)
      .map((run) => run.sizePt ?? DEFAULT_SIZE_PT),
  );

  return sizes.length > 0 ? Math.min(...sizes) : DEFAULT_SIZE_PT;
}
