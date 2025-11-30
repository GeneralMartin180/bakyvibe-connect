import { supabase } from "@/integrations/supabase/client";

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private conversationId: string;
  private currentUserId: string;
  private onRemoteStream: (stream: MediaStream) => void;
  private onCallEnd: () => void;
  private signalingChannel: any;

  constructor(
    conversationId: string,
    currentUserId: string,
    onRemoteStream: (stream: MediaStream) => void,
    onCallEnd: () => void
  ) {
    this.conversationId = conversationId;
    this.currentUserId = currentUserId;
    this.onRemoteStream = onRemoteStream;
    this.onCallEnd = onCallEnd;
  }

  async startCall(isVideo: boolean = false) {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from('messages').insert({
            conversation_id: this.conversationId,
            sender_id: this.currentUserId,
            content: JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate
            })
          });
        }
      };

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer via signaling
      await supabase.from('messages').insert({
        conversation_id: this.conversationId,
        sender_id: this.currentUserId,
        content: JSON.stringify({
          type: 'call-offer',
          offer: offer,
          isVideo: isVideo
        })
      });

      // Subscribe to signaling messages
      this.setupSignaling();

      return this.localStream;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async answerCall(offer: RTCSessionDescriptionInit, isVideo: boolean = false) {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from('messages').insert({
            conversation_id: this.conversationId,
            sender_id: this.currentUserId,
            content: JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate
            })
          });
        }
      };

      // Set remote description and create answer
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer via signaling
      await supabase.from('messages').insert({
        conversation_id: this.conversationId,
        sender_id: this.currentUserId,
        content: JSON.stringify({
          type: 'call-answer',
          answer: answer
        })
      });

      // Subscribe to signaling messages
      this.setupSignaling();

      return this.localStream;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  private setupSignaling() {
    this.signalingChannel = supabase
      .channel(`call:${this.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${this.conversationId}`
        },
        async (payload) => {
          try {
            const content = JSON.parse(payload.new.content);
            
            if (payload.new.sender_id === this.currentUserId) return;

            if (content.type === 'call-answer' && this.peerConnection) {
              await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(content.answer)
              );
            } else if (content.type === 'ice-candidate' && this.peerConnection) {
              await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(content.candidate)
              );
            } else if (content.type === 'call-end') {
              this.endCall();
            }
          } catch (error) {
            console.error('Error handling signaling message:', error);
          }
        }
      )
      .subscribe();
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  async endCall() {
    // Send end call signal
    if (this.conversationId && this.currentUserId) {
      await supabase.from('messages').insert({
        conversation_id: this.conversationId,
        sender_id: this.currentUserId,
        content: JSON.stringify({ type: 'call-end' })
      });
    }

    // Clean up
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.signalingChannel) {
      await supabase.removeChannel(this.signalingChannel);
      this.signalingChannel = null;
    }

    this.onCallEnd();
  }

  getLocalStream() {
    return this.localStream;
  }
}