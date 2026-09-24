import React from 'react';
import HrPipelineView from './HrPipelineView';

/**
 * HrFollowUpBoard is unified with HrPipelineView.
 * Renders the unified Pipeline & Follow-ups component in Follow-up Board view mode.
 */
export default function HrFollowUpBoard(props) {
  return <HrPipelineView {...props} initialViewMode="followup" />;
}
