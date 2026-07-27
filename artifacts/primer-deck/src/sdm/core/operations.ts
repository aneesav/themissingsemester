import type {
  Element,
  Frame,
  Paragraph,
  SlideDocument,
  TextBody,
} from './schema';

function mapElementTree(
  elements: Array<Element>,
  elementId: string,
  update: (element: Element) => Element,
): { elements: Array<Element>; changed: boolean } {
  let changed = false;
  const next = elements.map((element) => {
    if (element.id === elementId) {
      const updated = update(element);
      if (updated !== element) {
        changed = true;
      }
      return updated;
    }
    if (element.type !== 'group') {
      return element;
    }
    const children = mapElementTree(element.children, elementId, update);
    if (!children.changed) {
      return element;
    }
    changed = true;
    return { ...element, children: children.elements };
  });

  return { elements: changed ? next : elements, changed };
}

export function findElement(
  document: SlideDocument,
  elementId: string,
): Element | undefined {
  const visit = (elements: Array<Element>): Element | undefined => {
    for (const element of elements) {
      if (element.id === elementId) {
        return element;
      }
      if (element.type === 'group') {
        const child = visit(element.children);
        if (child) {
          return child;
        }
      }
    }

    return undefined;
  };

  return visit(document.elements);
}

export function updateElement(
  document: SlideDocument,
  elementId: string,
  update: (element: Element) => Element,
): SlideDocument {
  const result = mapElementTree(document.elements, elementId, update);

  return result.changed ? { ...document, elements: result.elements } : document;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => jsonEqual(item, right[index]))
    );
  }
  if (
    typeof left !== 'object' ||
    typeof right !== 'object' ||
    left === null ||
    right === null
  ) {
    return false;
  }
  const leftKeys = definedKeys(left);
  const rightKeys = definedKeys(right);

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.hasOwn(right, key) &&
        jsonEqual(
          (left as Record<string, unknown>)[key],
          (right as Record<string, unknown>)[key],
        ),
    )
  );
}

function definedKeys(value: object): Array<string> {
  return Object.keys(value).filter(
    (key) => (value as Record<string, unknown>)[key] !== undefined,
  );
}

function sameFrame(left: Frame, right: Frame): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

export function setElementFrame(
  document: SlideDocument,
  elementId: string,
  frame: Frame,
): SlideDocument {
  return updateElement(document, elementId, (element) =>
    sameFrame(element.frame, frame) ? element : { ...element, frame },
  );
}

export function textBodyOf(element: Element): TextBody | undefined {
  if (element.type === 'text') {
    return element.body;
  }
  if (element.type === 'shape') {
    return element.body;
  }

  return undefined;
}

export function setText(
  document: SlideDocument,
  elementId: string,
  paragraphs: Array<Paragraph>,
): SlideDocument {
  return updateElement(document, elementId, (element) => {
    if (
      element.type === 'text' &&
      !jsonEqual(element.body.paragraphs, paragraphs)
    ) {
      return { ...element, body: { ...element.body, paragraphs } };
    }
    if (
      element.type === 'shape' &&
      element.body &&
      !jsonEqual(element.body.paragraphs, paragraphs)
    ) {
      return { ...element, body: { ...element.body, paragraphs } };
    }

    return element;
  });
}

export function addElement(
  document: SlideDocument,
  element: Element,
): SlideDocument {
  return { ...document, elements: [...document.elements, element] };
}

export function removeElement(
  document: SlideDocument,
  elementId: string,
): SlideDocument {
  const remove = (
    elements: Array<Element>,
  ): { elements: Array<Element>; changed: boolean } => {
    let changed = false;
    const next: Array<Element> = [];
    for (const element of elements) {
      if (element.id === elementId) {
        changed = true;
        continue;
      }
      if (element.type === 'group') {
        const children = remove(element.children);
        if (children.changed) {
          changed = true;
          next.push({ ...element, children: children.elements });
          continue;
        }
      }
      next.push(element);
    }

    return { elements: changed ? next : elements, changed };
  };
  const result = remove(document.elements);

  return result.changed ? { ...document, elements: result.elements } : document;
}

export function reorderRootElement(
  document: SlideDocument,
  elementId: string,
  destinationIndex: number,
): SlideDocument {
  const sourceIndex = document.elements.findIndex(
    (element) => element.id === elementId,
  );
  if (sourceIndex === -1 || document.elements[sourceIndex].locked) {
    return document;
  }
  const index = Math.max(
    0,
    Math.min(destinationIndex, document.elements.length - 1),
  );
  if (index === sourceIndex) {
    return document;
  }
  const next = [...document.elements];
  const [element] = next.splice(sourceIndex, 1);
  next.splice(index, 0, element);

  return { ...document, elements: next };
}

export function bringToFront(
  document: SlideDocument,
  elementId: string,
): SlideDocument {
  return reorderRootElement(document, elementId, document.elements.length - 1);
}

export function sendToBack(
  document: SlideDocument,
  elementId: string,
): SlideDocument {
  return reorderRootElement(document, elementId, 0);
}

export function normalizeRootElementIds(
  document: SlideDocument,
  elementIds: Array<string>,
): Array<string> {
  const requested = new Set(elementIds);

  return document.elements
    .filter((element) => requested.has(element.id))
    .map((element) => element.id);
}

export function getRootElements(
  document: SlideDocument,
  elementIds: Array<string>,
): Array<Element> {
  const normalized = new Set(normalizeRootElementIds(document, elementIds));

  return document.elements.filter((element) => normalized.has(element.id));
}

export function selectAllRootElementIds(
  document: SlideDocument,
): Array<string> {
  return document.elements
    .filter((element) => !element.hidden)
    .map((element) => element.id);
}

export interface RootPointerSelectionPlan {
  selectedIds: Array<string>;
  collapseTo?: string;
}

export function planRootPointerSelection(
  document: SlideDocument,
  currentIds: Array<string>,
  clickedId: string | null,
  additive: boolean,
): RootPointerSelectionPlan {
  const current = normalizeRootElementIds(document, currentIds);
  if (!clickedId) {
    return { selectedIds: [] };
  }
  if (additive) {
    const next = current.includes(clickedId)
      ? current.filter((elementId) => elementId !== clickedId)
      : [...current, clickedId];

    return { selectedIds: normalizeRootElementIds(document, next) };
  }
  if (current.includes(clickedId) && current.length > 1) {
    return { selectedIds: current, collapseTo: clickedId };
  }

  return { selectedIds: normalizeRootElementIds(document, [clickedId]) };
}

function mutableRootSelection(
  document: SlideDocument,
  elementIds: Array<string>,
): Set<string> | null {
  const selectedElements = getRootElements(document, elementIds);
  if (
    selectedElements.length === 0 ||
    selectedElements.some((element) => element.locked)
  ) {
    return null;
  }

  return new Set(selectedElements.map((element) => element.id));
}

export function translateRootElements(
  document: SlideDocument,
  elementIds: Array<string>,
  dx: number,
  dy: number,
): SlideDocument {
  if (dx === 0 && dy === 0) {
    return document;
  }
  const selected = mutableRootSelection(document, elementIds);
  if (!selected) {
    return document;
  }

  return {
    ...document,
    elements: document.elements.map((element) =>
      selected.has(element.id)
        ? {
            ...element,
            frame: {
              ...element.frame,
              x: element.frame.x + dx,
              y: element.frame.y + dy,
            },
          }
        : element,
    ),
  };
}

export function removeRootElements(
  document: SlideDocument,
  elementIds: Array<string>,
): SlideDocument {
  const selected = mutableRootSelection(document, elementIds);
  if (!selected) {
    return document;
  }

  return {
    ...document,
    elements: document.elements.filter((element) => !selected.has(element.id)),
  };
}

function sameRootOrder(left: Array<Element>, right: Array<Element>): boolean {
  return (
    left.length === right.length &&
    left.every((element, index) => element === right[index])
  );
}

function withRootOrder(
  document: SlideDocument,
  next: Array<Element>,
): SlideDocument {
  return sameRootOrder(document.elements, next)
    ? document
    : { ...document, elements: next };
}

export function bringRootElementsToFront(
  document: SlideDocument,
  elementIds: Array<string>,
): SlideDocument {
  const selected = mutableRootSelection(document, elementIds);
  if (!selected) {
    return document;
  }
  const unselected = document.elements.filter(
    (element) => !selected.has(element.id),
  );
  const selectedInOrder = document.elements.filter((element) =>
    selected.has(element.id),
  );

  return withRootOrder(document, [...unselected, ...selectedInOrder]);
}

export function sendRootElementsToBack(
  document: SlideDocument,
  elementIds: Array<string>,
): SlideDocument {
  const selected = mutableRootSelection(document, elementIds);
  if (!selected) {
    return document;
  }
  const selectedInOrder = document.elements.filter((element) =>
    selected.has(element.id),
  );
  const unselected = document.elements.filter(
    (element) => !selected.has(element.id),
  );

  return withRootOrder(document, [...selectedInOrder, ...unselected]);
}

export function bringRootElementsForward(
  document: SlideDocument,
  elementIds: Array<string>,
): SlideDocument {
  const selected = mutableRootSelection(document, elementIds);
  if (!selected) {
    return document;
  }
  const next = [...document.elements];
  for (let index = next.length - 2; index >= 0; index -= 1) {
    const element = next[index];
    const above = next[index + 1];
    if (selected.has(element.id) && !selected.has(above.id)) {
      next[index] = above;
      next[index + 1] = element;
    }
  }

  return withRootOrder(document, next);
}

export function sendRootElementsBackward(
  document: SlideDocument,
  elementIds: Array<string>,
): SlideDocument {
  const selected = mutableRootSelection(document, elementIds);
  if (!selected) {
    return document;
  }
  const next = [...document.elements];
  for (let index = 1; index < next.length; index += 1) {
    const element = next[index];
    const below = next[index - 1];
    if (selected.has(element.id) && !selected.has(below.id)) {
      next[index] = below;
      next[index - 1] = element;
    }
  }

  return withRootOrder(document, next);
}

function collectIds(elements: Array<Element>, into: Set<string>): void {
  for (const element of elements) {
    into.add(element.id);
    if (element.type === 'group') {
      collectIds(element.children, into);
    }
  }
}

export function nextId(document: SlideDocument, prefix: string): string {
  const used = new Set<string>();
  collectIds(document.elements, used);
  let n = 1;
  while (used.has(`${prefix}-${n}`)) {
    n += 1;
  }

  return `${prefix}-${n}`;
}

const DUPLICATE_OFFSET = 24;

export function duplicateRootElements(
  document: SlideDocument,
  elementIds: Array<string>,
): { document: SlideDocument; newIds: Array<string> } {
  const selected = mutableRootSelection(document, elementIds);
  if (!selected) {
    return { document, newIds: [] };
  }
  const used = new Set<string>();
  collectIds(document.elements, used);
  const rename = (node: Element): void => {
    let candidate = `${node.id}-copy`;
    let n = 1;
    while (used.has(candidate)) {
      n += 1;
      candidate = `${node.id}-copy-${n}`;
    }
    used.add(candidate);
    node.id = candidate;
    if (node.type === 'group') {
      node.children.forEach(rename);
    }
  };
  const clones = document.elements
    .filter((element) => selected.has(element.id))
    .map((source) => {
      const clone = structuredClone(source);
      rename(clone);
      clone.frame = {
        ...clone.frame,
        x: clone.frame.x + DUPLICATE_OFFSET,
        y: clone.frame.y + DUPLICATE_OFFSET,
      };

      return clone;
    });

  return {
    document: { ...document, elements: [...document.elements, ...clones] },
    newIds: clones.map((clone) => clone.id),
  };
}

function visualBounds(element: Element): Frame {
  const angle = ((element.rotationDeg ?? 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const width = cos * element.frame.width + sin * element.frame.height;
  const height = sin * element.frame.width + cos * element.frame.height;

  return {
    x: element.frame.x + (element.frame.width - width) / 2,
    y: element.frame.y + (element.frame.height - height) / 2,
    width,
    height,
  };
}

function snapNearInteger(value: number): number {
  const rounded = Math.round(value);

  return Math.abs(value - rounded) < 1e-9 ? rounded : value;
}

function unionFrames(left: Frame, right: Frame): Frame {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const rightEdge = Math.max(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.max(left.y + left.height, right.y + right.height);

  return { x, y, width: rightEdge - x, height: bottomEdge - y };
}

export function groupRootElements(
  document: SlideDocument,
  elementIds: Array<string>,
): { document: SlideDocument; groupId: string } | null {
  const selectedIds = normalizeRootElementIds(document, elementIds);
  const selected = getRootElements(document, selectedIds);
  if (selected.length < 2 || selected.some((element) => element.locked)) {
    return null;
  }
  const bounds = selected.reduce(
    (result, element) => unionFrames(result, visualBounds(element)),
    visualBounds(selected[0]),
  );
  const left = Math.floor(snapNearInteger(bounds.x));
  const top = Math.floor(snapNearInteger(bounds.y));
  const frame: Frame = {
    x: left,
    y: top,
    width: Math.ceil(snapNearInteger(bounds.x + bounds.width)) - left,
    height: Math.ceil(snapNearInteger(bounds.y + bounds.height)) - top,
  };
  const groupId = nextId(document, 'group');
  const children = selected.map((element) => ({
    ...element,
    frame: {
      ...element.frame,
      x: element.frame.x - frame.x,
      y: element.frame.y - frame.y,
    },
  }));
  const group: Element = {
    id: groupId,
    type: 'group',
    name: 'Group',
    frame,
    coordinateSpace: { width: frame.width, height: frame.height },
    children,
  };
  const selectedSet = new Set(selectedIds);
  const frontmostIndex = Math.max(
    ...document.elements.map((element, index) =>
      selectedSet.has(element.id) ? index : -1,
    ),
  );
  const insertionIndex =
    frontmostIndex -
    document.elements
      .slice(0, frontmostIndex)
      .filter((element) => selectedSet.has(element.id)).length;
  const remaining = document.elements.filter(
    (element) => !selectedSet.has(element.id),
  );
  remaining.splice(insertionIndex, 0, group);

  return { document: { ...document, elements: remaining }, groupId };
}

export function canUngroupRootElement(element: Element | undefined): boolean {
  return (
    element?.type === 'group' &&
    !element.locked &&
    !element.clip &&
    !element.action &&
    !element.altText &&
    (element.opacity === undefined || element.opacity === 1) &&
    (element.rotationDeg === undefined || element.rotationDeg === 0) &&
    !element.flipH &&
    !element.flipV &&
    Math.abs(element.frame.width - element.coordinateSpace.width) < 0.001 &&
    Math.abs(element.frame.height - element.coordinateSpace.height) < 0.001
  );
}

export function ungroupRootElement(
  document: SlideDocument,
  groupId: string,
): { document: SlideDocument; elementIds: Array<string> } | null {
  const index = document.elements.findIndex(
    (element) => element.id === groupId,
  );
  const group = document.elements[index];
  if (index < 0 || !canUngroupRootElement(group) || group.type !== 'group') {
    return null;
  }
  const children = group.children.map((child) => {
    const root = {
      ...child,
      frame: {
        ...child.frame,
        x: group.frame.x + child.frame.x,
        y: group.frame.y + child.frame.y,
      },
    };

    return group.hidden ? { ...root, hidden: true } : root;
  });
  const next = [...document.elements];
  next.splice(index, 1, ...children);

  return {
    document: { ...document, elements: next },
    elementIds: children.map((child) => child.id),
  };
}
