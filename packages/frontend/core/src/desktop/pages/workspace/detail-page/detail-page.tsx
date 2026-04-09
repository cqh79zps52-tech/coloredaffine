import { Scrollable } from '@affine/component';
import { PageDetailLoading } from '@affine/component/page-detail-skeleton';
import type { AffineEditorContainer } from '@affine/core/blocksuite/block-suite-editor';
import { EditorOutlineViewer } from '@affine/core/blocksuite/outline-viewer';
import { AffineErrorBoundary } from '@affine/core/components/affine/affine-error-boundary';
import { GlobalPageHistoryModal } from '@affine/core/components/affine/page-history-modal';
import { useGuard } from '@affine/core/components/guard';
import { useAppSettingHelper } from '@affine/core/components/hooks/affine/use-app-setting-helper';
import { useRegisterBlocksuiteEditorCommands } from '@affine/core/components/hooks/affine/use-register-blocksuite-editor-commands';
import { useActiveBlocksuiteEditor } from '@affine/core/components/hooks/use-block-suite-editor';
import { PageDetailEditor } from '@affine/core/components/page-detail-editor';
import { TrashPageFooter } from '@affine/core/components/pure/trash-page-footer';
// The right sidebar's old tab collection (chat, properties, journal,
// outline, frame, adapter, comment, analytics) was replaced with a
// single pan/zoom Calendar canvas. The tab source files under
// `./tabs/` are left in place intentionally — they are dead code
// that can be restored if the previous layout is ever wanted back.
import { CalendarCanvas } from '@affine/core/components/root-app-sidebar/classics/calendar-canvas';
import { TopTip } from '@affine/core/components/top-tip';
import { DocService } from '@affine/core/modules/doc';
import { EditorService } from '@affine/core/modules/editor';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { JournalService } from '@affine/core/modules/journal';
import { PeekViewService } from '@affine/core/modules/peek-view';
import { RecentDocsService } from '@affine/core/modules/quicksearch';
import {
  useIsActiveView,
  ViewBody,
  ViewHeader,
  ViewService,
  ViewSidebarTab,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { isNewTabTrigger } from '@affine/core/utils';
import track from '@affine/track';
import { DisposableGroup } from '@blocksuite/affine/global/disposable';
import { RefNodeSlotsProvider } from '@blocksuite/affine/inlines/reference';
import { focusBlockEnd } from '@blocksuite/affine/shared/commands';
import { getLastNoteBlock } from '@blocksuite/affine/shared/utils';
import { CalendarPanelIcon } from '@blocksuite/icons/rc';
import {
  FrameworkScope,
  useLiveData,
  useService,
  useServices,
} from '@toeverything/infra';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { PageNotFound } from '../../404';
import * as styles from './detail-page.css';
import { DetailPageHeader } from './detail-page-header';
import { DetailPageWrapper } from './detail-page-wrapper';

const DetailPageImpl = memo(function DetailPageImpl() {
  const {
    workbenchService,
    viewService,
    editorService,
    docService,
    workspaceService,
    globalContextService,
  } = useServices({
    WorkbenchService,
    ViewService,
    EditorService,
    DocService,
    WorkspaceService,
    GlobalContextService,
  });
  const workbench = workbenchService.workbench;
  const editor = editorService.editor;
  const view = viewService.view;
  const workspace = workspaceService.workspace;
  const globalContext = globalContextService.globalContext;
  const doc = docService.doc;

  const mode = useLiveData(editor.mode$);

  const isInTrash = useLiveData(doc.meta$.map(meta => meta.trash));
  const editorContainer = useLiveData(editor.editorContainer$);

  const isSideBarOpen = useLiveData(workbench.sidebarOpen$);
  const { appSettings } = useAppSettingHelper();

  const peekView = useService(PeekViewService).peekView;

  const isActiveView = useIsActiveView();
  // TODO(@eyhn): remove jotai here
  const [_, setActiveBlockSuiteEditor] = useActiveBlocksuiteEditor();

  useEffect(() => {
    if (isActiveView) {
      setActiveBlockSuiteEditor(editorContainer);
    }
  }, [editorContainer, isActiveView, setActiveBlockSuiteEditor]);

  useEffect(() => {
    if (isActiveView) {
      globalContext.docId.set(doc.id);
      globalContext.isDoc.set(true);

      return () => {
        globalContext.docId.set(null);
        globalContext.isDoc.set(false);
      };
    }
    return;
  }, [doc, globalContext, isActiveView]);

  useEffect(() => {
    if (isActiveView) {
      globalContext.docMode.set(mode);

      return () => {
        globalContext.docMode.set(null);
      };
    }
    return;
  }, [doc, globalContext, isActiveView, mode]);

  useEffect(() => {
    if (isActiveView) {
      globalContext.isTrashDoc.set(!!isInTrash);

      return () => {
        globalContext.isTrashDoc.set(null);
      };
    }
    return;
  }, [globalContext, isActiveView, isInTrash]);

  useRegisterBlocksuiteEditorCommands(editor, isActiveView);

  const journalService = useService(JournalService);
  const isJournal = !!useLiveData(journalService.journalDate$(doc.id));

  const onLoad = useCallback(
    (editorContainer: AffineEditorContainer) => {
      const std = editorContainer.std;
      const disposable = new DisposableGroup();

      // Check if journal and handle accordingly to set focus on input block.
      if (isJournal) {
        const rafId = requestAnimationFrame(() => {
          try {
            if (!editorContainer.isConnected) return;
            const page = editorContainer.page;
            const note = getLastNoteBlock(page);
            const std = editorContainer.std;
            if (note) {
              const lastBlock = note.lastChild();
              if (lastBlock) {
                const focusBlock = std.view.getBlock(lastBlock.id) ?? undefined;
                std.command.exec(focusBlockEnd, { focusBlock, force: true });
                return;
              }
            }
            std.command.exec(focusBlockEnd, { force: true });
          } catch (error) {
            console.error('Failed to focus journal body', error);
          }
        });
        disposable.add(() => cancelAnimationFrame(rafId));
      }
      if (std) {
        const refNodeSlots = std.getOptional(RefNodeSlotsProvider);
        if (refNodeSlots) {
          disposable.add(
            // the event should not be emitted by AffineReference
            refNodeSlots.docLinkClicked.subscribe(
              ({ pageId, params, openMode, event, host }) => {
                if (host !== editorContainer.host) {
                  return;
                }
                openMode ??=
                  event && isNewTabTrigger(event)
                    ? 'open-in-new-tab'
                    : 'open-in-active-view';

                if (openMode === 'open-in-new-view') {
                  track.doc.editor.toolbar.openInSplitView();
                } else if (openMode === 'open-in-center-peek') {
                  track.doc.editor.toolbar.openInPeekView();
                } else if (openMode === 'open-in-new-tab') {
                  track.doc.editor.toolbar.openInNewTab();
                }

                if (openMode !== 'open-in-center-peek') {
                  const at = (() => {
                    if (openMode === 'open-in-active-view') {
                      return 'active';
                    }
                    // split view is only supported on electron
                    if (openMode === 'open-in-new-view') {
                      return BUILD_CONFIG.isElectron ? 'tail' : 'new-tab';
                    }
                    if (openMode === 'open-in-new-tab') {
                      return 'new-tab';
                    }
                    return 'active';
                  })();
                  workbench.openDoc(
                    {
                      docId: pageId,
                      mode: params?.mode,
                      blockIds: params?.blockIds,
                      elementIds: params?.elementIds,
                      refreshKey: nanoid(),
                    },
                    {
                      at: at,
                      show: true,
                    }
                  );
                } else {
                  peekView
                    .open({
                      docRef: {
                        docId: pageId,
                      },
                      ...params,
                    })
                    .catch(console.error);
                }
              }
            )
          );
        }
      }

      const unbind = editor.bindEditorContainer(
        editorContainer,
        (editorContainer as any).docTitle, // set from proxy
        scrollViewportRef.current
      );

      return () => {
        unbind();
        disposable.dispose();
      };
    },
    [editor, workbench, peekView, isJournal]
  );

  const [hasScrollTop, setHasScrollTop] = useState(false);

  // The outline viewer's "open panel" affordance used to switch the
  // right sidebar to its "outline" tab. That tab no longer exists
  // (the right sidebar is now a single Calendar canvas), so we just
  // open the sidebar — the user ends up on the Calendar tab, which
  // is the only tab. EditorOutlineViewer itself still renders its
  // own floating mini-outline regardless.
  const openOutlinePanel = useCallback(() => {
    workbench.openSidebar();
    view.activeSidebarTab('calendar');
  }, [workbench, view]);

  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;

    const hasScrollTop = scrollTop > 0;
    setHasScrollTop(hasScrollTop);
  }, []);

  const [dragging, setDragging] = useState(false);

  const canEdit = useGuard('Doc_Update', doc.id);

  const readonly = !canEdit || isInTrash;

  return (
    <FrameworkScope scope={editor.scope}>
      <ViewHeader>
        <DetailPageHeader
          page={doc.blockSuiteDoc}
          workspace={workspace}
          onDragging={setDragging}
        />
      </ViewHeader>
      <ViewBody>
        <div
          className={styles.mainContainer}
          data-dynamic-top-border={BUILD_CONFIG.isElectron}
          data-has-scroll-top={hasScrollTop}
        >
          {/* Add a key to force rerender when page changed, to avoid error boundary persisting. */}
          <AffineErrorBoundary key={doc.id}>
            <TopTip pageId={doc.id} workspace={workspace} />
            <Scrollable.Root>
              <Scrollable.Viewport
                onScroll={handleScroll}
                ref={scrollViewportRef}
                data-dragging={dragging}
                className={clsx(
                  'affine-page-viewport',
                  styles.affineDocViewport,
                  styles.editorContainer,
                  { [styles.pageModeViewportContentBox]: mode === 'page' }
                )}
              >
                <PageDetailEditor onLoad={onLoad} readonly={readonly} />
              </Scrollable.Viewport>
              <Scrollable.Scrollbar
                className={clsx({
                  [styles.scrollbar]: !appSettings.clientBorder,
                })}
              />
            </Scrollable.Root>
            <EditorOutlineViewer
              editor={editorContainer?.host ?? null}
              show={mode === 'page' && !isSideBarOpen}
              openOutlinePanel={openOutlinePanel}
            />
          </AffineErrorBoundary>
          {isInTrash ? <TrashPageFooter /> : null}
        </div>
      </ViewBody>

      {/*
        Right sidebar is now a single pan/zoom Calendar canvas. The
        previous mix of tabs (chat, properties, journal, outline,
        frame, adapter, comment, analytics) was removed; their panel
        source files under ./tabs/ are intentionally kept in place
        as dead code in case the previous layout is ever restored.
      */}
      <ViewSidebarTab tabId="calendar" icon={<CalendarPanelIcon />}>
        <CalendarCanvas />
      </ViewSidebarTab>

      <GlobalPageHistoryModal />
      {/* FIXME: wait for better ai, <PageAIOnboarding /> */}
    </FrameworkScope>
  );
});

export const Component = () => {
  const params = useParams();
  const recentPages = useService(RecentDocsService);

  useEffect(() => {
    if (params.pageId) {
      const pageId = params.pageId;
      localStorage.setItem('last_page_id', pageId);

      recentPages.addRecentDoc(pageId);
    }
  }, [params, recentPages]);

  const pageId = params.pageId;
  const canAccess = useGuard('Doc_Read', pageId ?? '');

  return pageId ? (
    <DetailPageWrapper
      pageId={pageId}
      canAccess={canAccess}
      skeleton={<PageDetailLoading />}
      notFound={<PageNotFound noPermission />}
    >
      <DetailPageImpl />
    </DetailPageWrapper>
  ) : null;
};
