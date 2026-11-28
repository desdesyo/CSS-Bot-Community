/**
 * Keeps issue reports tied to the recording started in the current page lifetime.
 * IndexedDB recovery is useful for manual log export, but must never masquerade as
 * fresh gameplay attached to a new bug report after a reload.
 */
export function buildIssueLogAttachment({ recording, session, pageId, records = [], events = [], performance = {} }) {
  const isCurrentSession = Boolean(
    recording &&
    session?.id &&
    session?.pageId &&
    session.pageId === pageId &&
    Number.isFinite(session.startedAtEpoch)
  );
  if (!isCurrentSession) {
    return {
      attached: false,
      reason: 'no-active-recording-in-current-page',
      sessionId: null,
      records: [],
      events: [],
      performance: null
    };
  }
  return {
    attached: true,
    reason: null,
    source: 'active-current-page',
    sessionId: session.id,
    startedAt: new Date(session.startedAtEpoch).toISOString(),
    durationMs: Math.max(0, Date.now() - session.startedAtEpoch),
    records: records.slice(-30),
    events: events.slice(-40),
    performance: {
      ...performance,
      frameMs: (performance.frameMs || []).slice(-120),
      renderMs: (performance.renderMs || []).slice(-120)
    }
  };
}
