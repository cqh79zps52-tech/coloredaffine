/**
 * A single calendar day rendered as a self-contained mini editor — the
 * cell IS a workspace doc rather than a link to one. Each cell mounts
 * its own BlockSuiteEditor so that slash commands like /todo, /h1 etc.
 * work natively in place.
 *
 * Mounting a real editor per day is heavy, so we gate behind interaction:
 * a day with no doc shows a "click to write" placeholder until activated.
 * Once a doc exists for the day, the editor stays mounted while the
 * calendar modal is open so the user sees its content live.
 */
import { type Doc, DocsService } from '@affine/core/modules/doc';
import { type Editor, EditorsService } from '@affine/core/modules/editor';
import { FrameworkScope, useLiveData, useService } from '@toeverything/infra';
import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

import * as styles from './styles.css';
import { useCalendarDocs } from './use-calendar-docs';

// Lazy import to avoid circular deps with the BlockSuite editor bundle.
const BlockSuiteEditor = lazy(() =>
  import('@affine/core/blocksuite/block-suite-editor').then(m => ({
    default: m.BlockSuiteEditor,
  }))
);

/**
 * Localised error boundary so a single broken day doesn't take the
 * whole calendar grid down. Loading a workspace doc into a freshly
 * mounted editor occasionally throws (e.g. the doc was deleted in
 * another tab) — we catch that, show a retry hint, and let the rest of
 * the month keep rendering.
 */
class DayCellErrorBoundary extends Component<
  { onReset: () => void; children: ReactNode },
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error) {
     
    console.warn('[calendar day cell] editor failed to mount', error);
  }

  private readonly handleRetry = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  override render() {
    if (this.state.error) {
      return (
        <button
          type="button"
          className={styles.calendarDayWriteButton}
          onClick={this.handleRetry}
        >
          ⟲ Retry
        </button>
      );
    }
    return this.props.children;
  }
}

interface MountedDayEditorProps {
  docId: string;
}

/**
 * Loads the doc + editor entities for a given workspace doc id and
 * renders a real BlockSuiteEditor inside the calendar cell.
 *
 * The open() call is deferred via requestIdleCallback so a calendar
 * with many active days doesn't try to construct dozens of doc scopes
 * inside the same React commit (which is what was triggering the
 * "Cannot read properties of undefined (reading 'blockSuiteDoc')"
 * crash).
 */
const MountedDayEditor = ({ docId }: MountedDayEditorProps) => {
  const docsService = useService(DocsService);
  const docListReady = useLiveData(docsService.list.isReady$);
  const docRecord = useLiveData(docsService.list.doc$(docId));
  const [doc, setDoc] = useState<Doc | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (!docListReady || !docRecord) return;
    let canceled = false;
    let release: (() => void) | undefined;

    const run = () => {
      if (canceled) return;
      try {
        const loaded = docsService.loaded(docId);
        if (loaded) {
          setDoc(loaded.doc);
          release = loaded.release;
          return;
        }
        const opened = docsService.open(docId);
        if (canceled) {
          opened.release();
          return;
        }
        setDoc(opened.doc);
        release = opened.release;
      } catch (e) {
        // Surface the error to the boundary so the cell can offer a
        // retry instead of crashing the whole calendar.
         
        console.warn('[calendar day cell] failed to open doc', docId, e);
        throw e;
      }
    };

    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(run, { timeout: 500 });
      return () => {
        canceled = true;
        cancelIdleCallback(handle);
        release?.();
      };
    }
    const handle = setTimeout(run, 0);
    return () => {
      canceled = true;
      clearTimeout(handle);
      release?.();
    };
  }, [docId, docListReady, docRecord, docsService]);

  // Create a per-cell editor entity scoped to the loaded doc.
  useLayoutEffect(() => {
    if (!doc) return;
    const e = doc.scope.get(EditorsService).createEditor();
    e.setMode('page');
    setEditor(e);
    return () => {
      e.dispose();
      setEditor(null);
    };
  }, [doc]);

  if (!doc || !editor) {
    return <div className={styles.calendarDayEditorLoading}>Loading…</div>;
  }

  return (
    <FrameworkScope scope={doc.scope}>
      <FrameworkScope scope={editor.scope}>
        <div className={styles.calendarDayEditorWrapper}>
          <Suspense
            fallback={
              <div className={styles.calendarDayEditorLoading}>Loading…</div>
            }
          >
            <BlockSuiteEditor
              className={styles.calendarDayEditor}
              mode="page"
              page={doc.blockSuiteDoc}
            />
          </Suspense>
        </div>
      </FrameworkScope>
    </FrameworkScope>
  );
};

interface DayEditorCellBodyProps {
  date: string;
}

/**
 * Body of a calendar day cell. If the day already has a backing doc we
 * mount the editor immediately so its content is visible. Otherwise we
 * show a "click to write" placeholder that creates the doc on first
 * interaction.
 */
export const DayEditorCellBody = ({ date }: DayEditorCellBodyProps) => {
  const { getDocId, ensureDocForDate } = useCalendarDocs();
  const existingDocId = getDocId(date);
  const [activatedDocId, setActivatedDocId] = useState<string | undefined>(
    existingDocId
  );
  // bumped on retry to remount the inner MountedDayEditor cleanly
  const [retryKey, setRetryKey] = useState(0);

  // If another tab/observer just created a doc for this date, surface it.
  useEffect(() => {
    if (existingDocId && !activatedDocId) {
      setActivatedDocId(existingDocId);
    }
  }, [existingDocId, activatedDocId]);

  const handleActivate = useCallback(() => {
    const id = ensureDocForDate(date);
    setActivatedDocId(id);
  }, [ensureDocForDate, date]);

  const handleRetry = useCallback(() => {
    setRetryKey(k => k + 1);
  }, []);

  if (activatedDocId) {
    return (
      <DayCellErrorBoundary key={retryKey} onReset={handleRetry}>
        <MountedDayEditor docId={activatedDocId} />
      </DayCellErrorBoundary>
    );
  }

  return (
    <button
      type="button"
      className={styles.calendarDayWriteButton}
      onClick={handleActivate}
    >
      + Click to write
    </button>
  );
};
