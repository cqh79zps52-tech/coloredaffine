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
  lazy,
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

interface MountedDayEditorProps {
  docId: string;
}

/**
 * Loads the doc + editor entities for a given workspace doc id and
 * renders a real BlockSuiteEditor inside the calendar cell.
 */
const MountedDayEditor = ({ docId }: MountedDayEditorProps) => {
  const docsService = useService(DocsService);
  const docListReady = useLiveData(docsService.list.isReady$);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Open the doc (refcounted via DocsService.open) and release on unmount.
  useEffect(() => {
    if (!docListReady) return;
    const record = docsService.list.doc$(docId).value;
    if (!record) return;
    const loaded = docsService.loaded(docId);
    if (loaded) {
      setDoc(loaded.doc);
      return () => loaded.release();
    }
    const { doc: opened, release } = docsService.open(docId);
    setDoc(opened);
    return () => release();
  }, [docId, docListReady, docsService]);

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

  if (activatedDocId) {
    return <MountedDayEditor docId={activatedDocId} />;
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
