import React from 'react';

// Browser (MediaRecorder) .webm files are saved without a duration header, so the
// <audio> player shows 0:00 and can't seek. Jumping to the end once forces the
// browser to scan the file and learn its real length, then we rewind.
export default function RecordingAudio(props) {
  const fixDuration = (e) => {
    const a = e.currentTarget;
    if (a.duration === Infinity || Number.isNaN(a.duration)) {
      const reset = () => {
        a.removeEventListener('timeupdate', reset);
        a.currentTime = 0;
      };
      a.addEventListener('timeupdate', reset);
      a.currentTime = 1e101;
    }
    if (props.onLoadedMetadata) props.onLoadedMetadata(e);
  };
  return <audio controls preload="metadata" {...props} onLoadedMetadata={fixDuration} />;
}
