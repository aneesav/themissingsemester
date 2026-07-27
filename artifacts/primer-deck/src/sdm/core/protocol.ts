import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import {
  parseSlideDocument,
  SlideDocumentSchema,
  type SdmIssue,
} from './schema';

/**
 * Wire contract between the workspace (authoritative document, history,
 * editor UI) and the thin slide-iframe runtime (rendering, gestures, caret).
 * Types and strict parsers only — transport, handshake state, and nonce
 * issuance live with the consumers.
 */
export const SDM_PROTOCOL_VERSION = 1;

/* Reserved for the context-menu request (spec PR 20); additive and negotiated,
 * never implemented at baseline. */
export const SDM_CONTEXT_MENU_PROTOCOL_VERSION = 2;

export type SdmSaveState = 'saving' | 'saved' | 'error';

export type SdmKnownCapability = 'edit';

const strict = { additionalProperties: false } as const;

const envelope = {
  protocolVersion: Type.Literal(SDM_PROTOCOL_VERSION),
  slideId: Type.String({ minLength: 1 }),
  sessionId: Type.String({ minLength: 1 }),
};

const selectedIds = Type.Array(Type.String({ minLength: 1 }));

export const WorkspaceToRuntimeMessageSchema = Type.Union([
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:setEditMode'),
      enabled: Type.Boolean(),
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:setDoc'),
      logicalRevision: Type.Integer({ minimum: 0 }),
      document: SlideDocumentSchema,
      selectedIds,
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:select'),
      selectedIds,
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:editText'),
      elementId: Type.String({ minLength: 1 }),
    },
    strict,
  ),
]);

export const RuntimeToWorkspaceMessageSchema = Type.Union([
  Type.Object(
    {
      type: Type.Literal('sdm:ready'),
      supportedProtocolVersions: Type.Array(Type.Integer({ minimum: 1 }), {
        minItems: 1,
        uniqueItems: true,
      }),
      slideId: Type.String({ minLength: 1 }),
      sessionId: Type.Optional(Type.String({ minLength: 1 })),
      capabilities: Type.Array(Type.String({ minLength: 1 })),
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:doc'),
      document: SlideDocumentSchema,
      selectedIds,
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:editModeChanged'),
      editing: Type.Boolean(),
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:selectionChanged'),
      selectedIds,
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:committed'),
      baseLogicalRevision: Type.Integer({ minimum: 0 }),
      transactionId: Type.String({ minLength: 1 }),
      document: SlideDocumentSchema,
      selectedIds,
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:historyRequest'),
      direction: Type.Union([Type.Literal('undo'), Type.Literal('redo')]),
    },
    strict,
  ),
  Type.Object(
    {
      ...envelope,
      type: Type.Literal('sdm:saveStatus'),
      state: Type.Union([
        Type.Literal('saving'),
        Type.Literal('saved'),
        Type.Literal('error'),
      ]),
      message: Type.Optional(Type.String()),
    },
    strict,
  ),
]);

export type WorkspaceToRuntimeMessage = Static<
  typeof WorkspaceToRuntimeMessageSchema
>;
export type RuntimeToWorkspaceMessage = Static<
  typeof RuntimeToWorkspaceMessageSchema
>;

export type ParseSdmMessageResult<Message> =
  | { ok: true; message: Message }
  | { ok: false; reason: 'invalid'; issues: Array<SdmIssue> }
  | { ok: false; reason: 'unsupportedVersion'; version: number };

export function isWorkspaceToRuntimeMessage(
  input: unknown,
): input is WorkspaceToRuntimeMessage {
  return parseWorkspaceToRuntimeMessage(input).ok;
}

export function isRuntimeToWorkspaceMessage(
  input: unknown,
): input is RuntimeToWorkspaceMessage {
  return parseRuntimeToWorkspaceMessage(input).ok;
}

function probeUnsupportedVersion(input: unknown): number | undefined {
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }
  const candidate = input as Record<string, unknown>;
  if (
    typeof candidate.type !== 'string' ||
    !candidate.type.startsWith('sdm:')
  ) {
    return undefined;
  }
  return typeof candidate.protocolVersion === 'number' &&
    Number.isInteger(candidate.protocolVersion) &&
    candidate.protocolVersion > SDM_PROTOCOL_VERSION
    ? candidate.protocolVersion
    : undefined;
}

function embeddedDocumentIssues(
  message: Record<string, unknown>,
): Array<SdmIssue> {
  if (!('document' in message)) {
    return [];
  }
  const result = parseSlideDocument(message.document);
  if (result.ok) {
    return [];
  }
  if (result.reason === 'invalid') {
    return result.issues.map((issue) => ({
      path: issue.path === '/' ? '/document' : `/document${issue.path}`,
      message: issue.message,
    }));
  }
  return [
    {
      path: '/document/version',
      message: `Unsupported SDM document version ${result.version}.`,
    },
  ];
}

function parseMessage<Message>(
  schema:
    | typeof WorkspaceToRuntimeMessageSchema
    | typeof RuntimeToWorkspaceMessageSchema,
  input: unknown,
): ParseSdmMessageResult<Message> {
  const futureVersion = probeUnsupportedVersion(input);
  if (futureVersion !== undefined) {
    return { ok: false, reason: 'unsupportedVersion', version: futureVersion };
  }
  if (!Value.Check(schema, input)) {
    const issues = [...Value.Errors(schema, input)].map((error) => ({
      path: error.path || '/',
      message: error.message,
    }));
    return { ok: false, reason: 'invalid', issues };
  }
  const documentIssues = embeddedDocumentIssues(
    input as Record<string, unknown>,
  );
  if (documentIssues.length > 0) {
    return { ok: false, reason: 'invalid', issues: documentIssues };
  }

  return { ok: true, message: input as Message };
}

export function parseWorkspaceToRuntimeMessage(
  input: unknown,
): ParseSdmMessageResult<WorkspaceToRuntimeMessage> {
  return parseMessage(WorkspaceToRuntimeMessageSchema, input);
}

export function parseRuntimeToWorkspaceMessage(
  input: unknown,
): ParseSdmMessageResult<RuntimeToWorkspaceMessage> {
  return parseMessage(RuntimeToWorkspaceMessageSchema, input);
}
