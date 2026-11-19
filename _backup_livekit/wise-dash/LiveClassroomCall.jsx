import React from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

// The actual video call (LiveKit prefab conference: video grid, screen share,
// chat, mic/camera/leave controls). Loaded lazily by LiveClassroom.jsx so the
// video libraries are only downloaded when someone opens a class.
export default function LiveClassroomCall({ serverUrl, token, isHost, onDisconnected, onError }) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      // Trainer comes in with camera + mic on; students join muted and can turn them on
      video={Boolean(isHost)}
      audio={Boolean(isHost)}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%' }}
      onDisconnected={onDisconnected}
      onError={onError}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
