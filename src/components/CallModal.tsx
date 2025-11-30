import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from "lucide-react";
import { WebRTCConnection } from "@/utils/webrtc";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId: string;
  otherUser: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  callOffer?: RTCSessionDescriptionInit;
}

export function CallModal({
  isOpen,
  onClose,
  conversationId,
  currentUserId,
  otherUser,
  callType,
  isIncoming = false,
  callOffer
}: CallModalProps) {
  const [callActive, setCallActive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callType === 'video');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCConnection | null>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (webrtcRef.current) {
      webrtcRef.current.endCall();
      webrtcRef.current = null;
    }
    setCallActive(false);
  };

  const handleAcceptCall = async () => {
    if (!callOffer) return;

    try {
      const rtc = new WebRTCConnection(
        conversationId,
        currentUserId,
        (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        () => {
          onClose();
        }
      );

      const localStream = await rtc.answerCall(callOffer, callType === 'video');
      
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }

      webrtcRef.current = rtc;
      setCallActive(true);
    } catch (error) {
      console.error('Error accepting call:', error);
      onClose();
    }
  };

  const handleStartCall = async () => {
    try {
      const rtc = new WebRTCConnection(
        conversationId,
        currentUserId,
        (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        () => {
          onClose();
        }
      );

      const localStream = await rtc.startCall(callType === 'video');
      
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }

      webrtcRef.current = rtc;
      setCallActive(true);
    } catch (error) {
      console.error('Error starting call:', error);
      onClose();
    }
  };

  const toggleAudio = () => {
    if (webrtcRef.current) {
      const enabled = webrtcRef.current.toggleAudio();
      setAudioEnabled(enabled);
    }
  };

  const toggleVideo = () => {
    if (webrtcRef.current) {
      const enabled = webrtcRef.current.toggleVideo();
      setVideoEnabled(enabled);
    }
  };

  const handleEndCall = () => {
    cleanup();
    onClose();
  };

  useEffect(() => {
    if (isOpen && !isIncoming) {
      handleStartCall();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <div className="relative bg-gradient-to-br from-background to-secondary h-[600px] flex flex-col">
          {/* Video container */}
          <div className="flex-1 relative">
            {callType === 'video' && (
              <>
                {/* Remote video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Local video (picture-in-picture) */}
                <div className="absolute top-4 right-4 w-32 h-40 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                </div>
              </>
            )}

            {/* Audio call UI */}
            {callType === 'audio' && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <Avatar className="w-32 h-32 border-4 border-primary">
                  <AvatarImage src={otherUser.avatar_url} />
                  <AvatarFallback className="text-4xl">
                    {otherUser.display_name?.[0] || otherUser.username[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{otherUser.display_name || otherUser.username}</h2>
                  <p className="text-muted-foreground">
                    {!callActive && isIncoming ? 'Incoming call...' : !callActive ? 'Calling...' : 'Connected'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-6 glass">
            {!callActive && isIncoming ? (
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleEndCall}
                  className="rounded-full w-16 h-16"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
                <Button
                  size="lg"
                  onClick={handleAcceptCall}
                  className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
                >
                  <Phone className="w-6 h-6" />
                </Button>
              </div>
            ) : callActive ? (
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  variant={audioEnabled ? "secondary" : "destructive"}
                  onClick={toggleAudio}
                  className="rounded-full w-14 h-14"
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
                
                {callType === 'video' && (
                  <Button
                    size="lg"
                    variant={videoEnabled ? "secondary" : "destructive"}
                    onClick={toggleVideo}
                    className="rounded-full w-14 h-14"
                  >
                    {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>
                )}
                
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleEndCall}
                  className="rounded-full w-14 h-14"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </div>
            ) : (
              <div className="flex justify-center">
                <p className="text-muted-foreground">Connecting...</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}