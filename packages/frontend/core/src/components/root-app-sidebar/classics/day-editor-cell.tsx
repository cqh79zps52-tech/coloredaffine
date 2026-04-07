/**
 * A single calendar day rendered as a self-contained mini editor — the
 * cell IS a workspace doc rather than a link to one. Slash commands
 * like /todo, /h1 etc. work natively in place.
 *
 * Important: only ONE day cell mounts a BlockSuiteEditor at a time. We
 * tried mounting an editor in every populated cell simultaneously, but
 * the BlockSuite editor sets `globalThis.currentEditor` and several
 * services rely on it being a single live editor; mounting many in
 * parallel raced into "Cannot read properties of undefined (reading
 * 'blockSuiteDoc')" crashes a few seconds after typing. Now the active
 * cell is whichever the user last clicked, and other cells fall back
 * to a placeholder that the user can click to take focus.
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
 * whole calendar grid down.
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
 * Loads the doc + editor entities for the active day and renders a
 * real BlockSuiteEditor. There is at most one of these mounted across
 * the whole calendar at any time, so it's safe to grab the editor's
 * normal globals.
 */
const MountedDayEditor = ({ docId }: MountedDayEditorProps) => {
  const docsService = useService(DocsService);
  const docListReady = useLiveData(docsService.list.isReady$);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Open the doc and hold a refcount until this cell is unmounted.
  // Deliberately *not* subscribed to the doc record — its updatedAt
  // would tick on every keystroke and re-run the effect, racing the
  // editor scope into the error boundary.
  useEffect(() => {
    if (!docListReady) return;
    if (!docsService.list.doc$(docId).value) return;
    let released = false;
    let release: (() => void) | undefined;
    try {
      const loaded = docsService.loaded(docId);
      if (loaded) {
        setDoc(loaded.doc);
        release = loaded.release;
      } else {
        const opened = docsService.open(docId);
        setDoc(opened.doc);
        release = opened.release;
      }
    } catch (e) {
      console.warn('[calendar day cell] failed to open doc', docId, e);
      throw e;
    }
    return () => {
      if (released) return;
      released = true;
      setDoc(null);
      setEditor(null);
      release?.();
    };
  }, [docId, docListReady, docsService]);

  // One Editor entity per loaded doc. Disposed when the doc changes
  // or this component unmounts.
  useLayoutEffect(() => {
    if (!doc) return;
    const e = doc.scope.get(EditorsService).createEditor();
    e.setMode('page');
    setEditor(e);
    return () => {
      e.dispose();
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
  active: boolean;
  onActivate: (date: string) => void;
}

/**
 * Body of a calendar day cell. The active cell mounts the real editor;
 * every other cell shows a placeholder that activates the cell when
 * clicked. Activating a cell automatically deactivates the previously
 * active one (handled at the calendar-panel level).
 */
export const DayEditorCellBody = ({
  date,
  active,
  onActivate,
}: DayEditorCellBodyProps) => {
  const { getDocId, ensureDocForDate } = useCalendarDocs();
  const existingDocId = getDocId(date);
  // Bump on retry so the error boundary can re-mount cleanly.
  const [retryKey, setRetryKey] = useState(0);

  const handleActivate = useCallback(() => {
    // Make sure the doc exists *before* activating, so the active cell
    // always has a valid docId to mount.
    ensureDocForDate(date);
    onActivate(date);
  }, [ensureDocForDate, date, onActivate]);

  const handleRetry = useCallback(() => {
    setRetryKey(k => k + 1);
  }, []);

  if (active) {
    // ensureDocForDate has already created the doc by the time we get
    // here, so existingDocId is guaranteed to be defined.
    const docId = existingDocId ?? ensureDocForDate(date);
    return (
      <DayCellErrorBoundary key={retryKey} onReset={handleRetry}>
        <MountedDayEditor docId={docId} />
      </DayCellErrorBoundary>
    );
  }

  return (
    <button
      type="button"
      className={styles.calendarDayWriteButton}
      onClick={handleActivate}
    >
      {existingDocId ? '📝 Click to edit' : '+ Click to write'}
    </button>
  );
};
