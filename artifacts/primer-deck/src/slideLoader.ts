import { createElement, type ComponentType } from 'react';
import manifestJson from '@/data/slides-manifest.json';
import {
  parseSlidesManifest,
  type SlideEntry,
} from '@/data/slidesManifestSchema';
import { SdmSlide } from '@/sdm/SdmSlide';

export interface LoadedSlide extends SlideEntry {
  Component: ComponentType;
}

const slideModules: Record<string, { default: ComponentType }> =
  import.meta.glob('./pages/slides/*.tsx', { eager: true });

const sdmModules: Record<string, { default: unknown }> = import.meta.glob(
  './data/slides/*.sdm.json',
  { eager: true },
);

function loadManifestSlides(): SlideEntry[] {
  try {
    return parseSlidesManifest(manifestJson);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new Error(
      `Invalid slide manifest. Run "pnpm run validate-slides" for details. ${reason}`,
    );
  }
}

function errorSlide(entry: SlideEntry, message: string) {
  return function ErrorSlide() {
    return createElement(
      'div',
      {
        style: {
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          background: '#1a1a1a',
          color: '#fca5a5',
          fontFamily: 'monospace',
          fontSize: 16,
          textAlign: 'center',
          border: '4px solid #fca5a5',
          boxSizing: 'border-box',
        },
        'data-sdm-slide-id': entry.id,
      },
      message,
    );
  };
}

const manifestSlides = loadManifestSlides();

export const slides: LoadedSlide[] = [...manifestSlides]
  .sort((a, b) => a.position - b.position)
  .map((entry) => {
    if (entry.kind === 'sdm') {
      const filename = `${entry.id}.sdm.json`;
      const expectedPath = `src/data/slides/${filename}`;
      const key = `./data/slides/${filename}`;
      const mod = sdmModules[key];
      if (entry.filepath !== expectedPath || !mod) {
        return {
          ...entry,
          Component: errorSlide(
            entry,
            `Slide "${entry.id}" references a missing or inconsistent SDM document. Expected ${expectedPath}. ` +
              'Run "pnpm run validate-slides" for details.',
          ),
        };
      }
      const Component = () =>
        createElement(SdmSlide, {
          slideId: entry.id,
          initialDocument: mod.default,
        });

      return { ...entry, Component };
    }

    const filename = entry.filepath.split('/').pop();
    if (!filename) {
      return {
        ...entry,
        Component: errorSlide(
          entry,
          `Slide "${entry.title}" has an invalid filepath: "${entry.filepath}".`,
        ),
      };
    }

    const key = `./pages/slides/${filename}`;
    const mod = slideModules[key];

    if (!mod) {
      const available = Object.keys(slideModules).join(', ');

      return {
        ...entry,
        Component: errorSlide(
          entry,
          `Slide "${entry.title}" references missing file: ${entry.filepath}. ` +
            `Available modules: ${available}`,
        ),
      };
    }

    return {
      ...entry,
      Component: mod.default,
    };
  });
