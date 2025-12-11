import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'video' | 'voice' | 'screen_share';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  room_id: string;
  started_at?: string;
  ended_at?: string;
}

interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export type VirtualBackground = 'none' | 'blur' | 'office' | 'nature' | 'abstract';

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC() {
  const { user } = useAuth();
  const { showNotification, requestPermission, permission } = useBrowserNotifications();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [virtualBackground, setVirtualBackground] = useState<VirtualBackground>('none');
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentCallRef = useRef<Call | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Request notification permission on mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);
  
  // Ensure local video is attached when stream and ref are both available
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  
  // Ensure remote video is attached when stream and ref are both available
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  // Initialize media stream
  const initializeMedia = useCallback(async (callType: 'video' | 'voice' | 'screen_share') => {
    try {
      let stream: MediaStream;
      
      if (callType === 'screen_share') {
        try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { 
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30, max: 60 }
            } as MediaTrackConstraints,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          
          // Handle screen share stop
          stream.getVideoTracks()[0].onended = () => {
            toast.info('Screen sharing stopped');
            setIsScreenSharing(false);
          };
          
          setIsScreenSharing(true);
        } catch (err: any) {
          if (err.name === 'NotAllowedError') {
            toast.error('Screen sharing was cancelled or denied');
          } else {
            toast.error('Failed to start screen sharing');
          }
          throw err;
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video' ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 }
          } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }
      
      originalStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      if ((error as any).name !== 'NotAllowedError') {
        toast.error('Failed to access camera/microphone. Please check permissions.');
      }
      throw error;
    }
  }, []);
  
  // Create peer connection
  const createPeerConnection = useCallback((callId: string, calleeId: string, isInitiator: boolean) => {
    const config: WebRTCConfig = {
      iceServers: DEFAULT_ICE_SERVERS
    };
    
    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;
    
    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const call = currentCallRef.current;
        const receiverId = isInitiator ? calleeId : call?.caller_id;
        
        if (receiverId) {
          console.log('Sending ICE candidate to:', receiverId);
          await supabase.from('webrtc_signals').insert([{
            call_id: callId,
            sender_id: user?.id!,
            receiver_id: receiverId,
            signal_type: 'ice-candidate',
            signal_data: JSON.parse(JSON.stringify({ candidate: event.candidate.toJSON() }))
          }]);
        }
      }
    };
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnecting(false);
        toast.success('Connected!');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        toast.error('Connection lost');
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };
    
    return pc;
  }, [user?.id]);
  
  // Start a call
  const startCall = useCallback(async (calleeId: string, callType: 'video' | 'voice' | 'screen_share' = 'video') => {
    if (!user?.id) {
      toast.error('You must be logged in to make calls');
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Initialize media first
      const stream = await initializeMedia(callType);
      
      // Create call record
      const { data: callData, error: callError } = await supabase
        .from('video_calls')
        .insert({
          caller_id: user.id,
          callee_id: calleeId,
          call_type: callType,
          status: 'ringing'
        })
        .select()
        .single();
      
      if (callError) throw callError;
      
      const call = callData as unknown as Call;
      setCurrentCall(call);
      currentCallRef.current = call;
      
      // Create peer connection
      const pc = createPeerConnection(call.id, calleeId, true);
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind);
        pc.addTrack(track, stream);
      });
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log('Sending offer to:', calleeId);
      await supabase.from('webrtc_signals').insert([{
        call_id: call.id,
        sender_id: user.id,
        receiver_id: calleeId,
        signal_type: 'offer',
        signal_data: JSON.parse(JSON.stringify({ sdp: offer.sdp, type: offer.type }))
      }]);
      
      toast.info('Calling...');
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      setIsConnecting(false);
      setCurrentCall(null);
      currentCallRef.current = null;
    }
  }, [user?.id, initializeMedia, createPeerConnection]);
  
  // Answer a call
  const answerCall = useCallback(async (call: Call) => {
    if (!user?.id) return;
    
    setIsConnecting(true);
    setCurrentCall(call);
    currentCallRef.current = call;
    setIncomingCall(null);
    
    try {
      // Update call status
      await supabase
        .from('video_calls')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('id', call.id);
      
      // Initialize media
      const stream = await initializeMedia(call.call_type as 'video' | 'voice' | 'screen_share');
      
      // Create peer connection
      const pc = createPeerConnection(call.id, call.caller_id, false);
      
      // Add tracks
      stream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind);
        pc.addTrack(track, stream);
      });
      
      // Get the offer
      const { data: signals } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('call_id', call.id)
        .eq('signal_type', 'offer')
        .single();
      
      if (signals?.signal_data) {
        const signalData = signals.signal_data as { sdp: string; type: RTCSdpType };
        console.log('Setting remote description from offer');
        await pc.setRemoteDescription(new RTCSessionDescription({
          sdp: signalData.sdp,
          type: signalData.type
        }));
        
        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log('Sending answer to:', call.caller_id);
        await supabase.from('webrtc_signals').insert([{
          call_id: call.id,
          sender_id: user.id,
          receiver_id: call.caller_id,
          signal_type: 'answer',
          signal_data: JSON.parse(JSON.stringify({ sdp: answer.sdp, type: answer.type }))
        }]);
        
        // Process any queued ICE candidates
        const { data: iceCandidates } = await supabase
          .from('webrtc_signals')
          .select('*')
          .eq('call_id', call.id)
          .eq('signal_type', 'ice-candidate')
          .eq('receiver_id', user.id)
          .eq('processed', false);
        
        for (const iceSignal of iceCandidates || []) {
          try {
            const candidateData = iceSignal.signal_data as unknown as { candidate: RTCIceCandidateInit };
            if (candidateData?.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData.candidate));
            }
          } catch (e) {
            console.error('Error adding queued ICE candidate:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
      setIsConnecting(false);
    }
  }, [user?.id, initializeMedia, createPeerConnection]);
  
  // Decline a call
  const declineCall = useCallback(async (call: Call) => {
    await supabase
      .from('video_calls')
      .update({ status: 'declined' })
      .eq('id', call.id);
    
    setIncomingCall(null);
  }, []);
  
  // End call
  const endCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (call) {
      await supabase
        .from('video_calls')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', call.id);
    }
    
    // Clean up streams
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    
    // Close peer connection
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
    currentCallRef.current = null;
    setIsConnecting(false);
  }, [localStream, remoteStream]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);
  
  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [localStream, isVideoOff]);
  
  // Start screen sharing during a call
  const startScreenShare = useCallback(async () => {
    if (!currentCall || !peerConnectionRef.current) return;
    
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 }
        } as MediaTrackConstraints,
        audio: true
      });
      
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }
      
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      setIsScreenSharing(true);
      setLocalStream(screenStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      
      toast.success('Screen sharing started');
    } catch (error: any) {
      if (error.name !== 'NotAllowedError') {
        toast.error('Failed to start screen sharing');
      }
    }
  }, [currentCall]);
  
  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current || !originalStreamRef.current) return;
    
    try {
      const videoTrack = originalStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
      
      localStream?.getVideoTracks().forEach(track => track.stop());
      setLocalStream(originalStreamRef.current);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = originalStreamRef.current;
      }
      
      setIsScreenSharing(false);
      toast.info('Screen sharing stopped');
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }, [localStream]);
  
  // Apply virtual background
  const applyVirtualBackground = useCallback((background: VirtualBackground) => {
    setVirtualBackground(background);
    
    if (background === 'none') {
      toast.success('Background removed');
    } else if (background === 'blur') {
      toast.success('Background blur applied');
    } else {
      toast.success(`${background.charAt(0).toUpperCase() + background.slice(1)} background applied`);
    }
  }, []);
  
  // Listen for incoming calls and signals
  useEffect(() => {
    if (!user?.id) return;
    
    // Listen for incoming calls
    const callsChannel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_calls',
          filter: `callee_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Incoming call:', payload);
          if (payload.new.status === 'ringing') {
            const call = payload.new as Call;
            setIncomingCall(call);
            toast.info('Incoming call...');
            
            // Show browser notification
            const callTypeLabel = call.call_type === 'video' ? 'Video' : 
                                  call.call_type === 'voice' ? 'Voice' : 'Screen Share';
            showNotification(`Incoming ${callTypeLabel} Call`, {
              body: 'Someone is calling you',
              tag: `call-${call.id}`,
              requireInteraction: true,
            });
          }
        }
      )
      .subscribe();
    
    // Listen for signals
    const signalsChannel = supabase
      .channel('webrtc-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          const signal = payload.new as {
            id: string;
            signal_type: string;
            signal_data: { sdp?: string; type?: RTCSdpType; candidate?: RTCIceCandidateInit };
            call_id: string;
          };
          
          console.log('Received signal:', signal.signal_type);
          
          const pc = peerConnectionRef.current;
          if (!pc) {
            console.log('No peer connection, ignoring signal');
            return;
          }
          
          try {
            if (signal.signal_type === 'answer' && signal.signal_data.sdp) {
              console.log('Setting remote description from answer');
              await pc.setRemoteDescription(new RTCSessionDescription({
                sdp: signal.signal_data.sdp,
                type: signal.signal_data.type!
              }));
              setIsConnecting(false);
              
              // Update call status
              await supabase
                .from('video_calls')
                .update({ status: 'active', started_at: new Date().toISOString() })
                .eq('id', signal.call_id);
            } else if (signal.signal_type === 'ice-candidate' && signal.signal_data.candidate) {
              console.log('Adding ICE candidate');
              await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
            }
          } catch (error) {
            console.error('Error processing signal:', error);
          }
        }
      )
      .subscribe();
    
    // Listen for call status changes
    const callStatusChannel = supabase
      .channel('call-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_calls'
        },
        (payload) => {
          const updatedCall = payload.new as Call;
          const call = currentCallRef.current;
          
          if (call?.id === updatedCall.id) {
            if (updatedCall.status === 'ended' || updatedCall.status === 'declined') {
              toast.info('Call ended');
              endCall();
            } else {
              setCurrentCall(updatedCall);
              currentCallRef.current = updatedCall;
            }
          }
          
          // Clear incoming call if it was declined/ended
          if (incomingCall?.id === updatedCall.id && 
              (updatedCall.status === 'declined' || updatedCall.status === 'ended')) {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(callStatusChannel);
    };
  }, [user?.id, incomingCall, endCall]);
  
  return {
    localStream,
    remoteStream,
    currentCall,
    incomingCall,
    isConnecting,
    isMuted,
    isVideoOff,
    isScreenSharing,
    virtualBackground,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    applyVirtualBackground,
    setLocalVideoRef: (ref: HTMLVideoElement | null) => { localVideoRef.current = ref; },
    setRemoteVideoRef: (ref: HTMLVideoElement | null) => { remoteVideoRef.current = ref; }
  };
}
