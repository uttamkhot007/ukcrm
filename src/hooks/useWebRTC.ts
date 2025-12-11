import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Call {
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

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC() {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Initialize media stream
  const initializeMedia = useCallback(async (callType: 'video' | 'voice' | 'screen_share') => {
    try {
      let stream: MediaStream;
      
      if (callType === 'screen_share') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: true
        });
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
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
      throw error;
    }
  }, []);
  
  // Create peer connection
  const createPeerConnection = useCallback((callId: string, isInitiator: boolean) => {
    const config: WebRTCConfig = {
      iceServers: DEFAULT_ICE_SERVERS
    };
    
    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;
    
    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && currentCall) {
        console.log('Sending ICE candidate');
        await supabase.from('webrtc_signals').insert([{
          call_id: callId,
          sender_id: user?.id!,
          receiver_id: isInitiator ? currentCall.callee_id : currentCall.caller_id,
          signal_type: 'ice-candidate',
          signal_data: JSON.parse(JSON.stringify({ candidate: event.candidate.toJSON() }))
        }]);
      }
    };
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track');
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        toast.error('Connection lost');
      }
    };
    
    return pc;
  }, [user?.id, currentCall]);
  
  // Start a call
  const startCall = useCallback(async (calleeId: string, callType: 'video' | 'voice' | 'screen_share' = 'video') => {
    if (!user?.id) return;
    
    setIsConnecting(true);
    
    try {
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
      
      setCurrentCall(callData as unknown as Call);
      
      // Initialize media
      const stream = await initializeMedia(callType);
      
      // Create peer connection
      const pc = createPeerConnection(callData.id, true);
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await supabase.from('webrtc_signals').insert([{
        call_id: callData.id,
        sender_id: user.id,
        receiver_id: calleeId,
        signal_type: 'offer',
        signal_data: JSON.parse(JSON.stringify({ sdp: offer.sdp, type: offer.type }))
      }]);
      
      toast.success('Calling...');
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      setIsConnecting(false);
    }
  }, [user?.id, initializeMedia, createPeerConnection]);
  
  // Answer a call
  const answerCall = useCallback(async (call: Call) => {
    if (!user?.id) return;
    
    setIsConnecting(true);
    setCurrentCall(call);
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
      const pc = createPeerConnection(call.id, false);
      
      // Add tracks
      stream.getTracks().forEach(track => {
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
        await pc.setRemoteDescription(new RTCSessionDescription({
          sdp: signalData.sdp,
          type: signalData.type
        }));
        
        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        await supabase.from('webrtc_signals').insert([{
          call_id: call.id,
          sender_id: user.id,
          receiver_id: call.caller_id,
          signal_type: 'answer',
          signal_data: JSON.parse(JSON.stringify({ sdp: answer.sdp, type: answer.type }))
        }]);
      }
      
      setIsConnecting(false);
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
    if (currentCall) {
      await supabase
        .from('video_calls')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', currentCall.id);
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
    setIsConnecting(false);
  }, [currentCall, localStream, remoteStream]);
  
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
        (payload) => {
          console.log('Incoming call:', payload);
          if (payload.new.status === 'ringing') {
            setIncomingCall(payload.new as Call);
            toast.info('Incoming call...');
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
            signal_type: string;
            signal_data: { sdp?: string; type?: RTCSdpType; candidate?: RTCIceCandidateInit };
            call_id: string;
          };
          
          console.log('Received signal:', signal.signal_type);
          
          const pc = peerConnectionRef.current;
          if (!pc) return;
          
          if (signal.signal_type === 'answer' && signal.signal_data.sdp) {
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
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data.candidate));
            } catch (error) {
              console.error('Error adding ICE candidate:', error);
            }
          }
          
          // Mark signal as processed
          await supabase
            .from('webrtc_signals')
            .update({ processed: true })
            .eq('id', (payload.new as { id: string }).id);
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
          if (currentCall?.id === updatedCall.id) {
            if (updatedCall.status === 'ended' || updatedCall.status === 'declined') {
              toast.info('Call ended');
              endCall();
            } else {
              setCurrentCall(updatedCall);
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
  }, [user?.id, currentCall, incomingCall, endCall]);
  
  return {
    localStream,
    remoteStream,
    currentCall,
    incomingCall,
    isConnecting,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    setLocalVideoRef: (ref: HTMLVideoElement | null) => { localVideoRef.current = ref; },
    setRemoteVideoRef: (ref: HTMLVideoElement | null) => { remoteVideoRef.current = ref; }
  };
}
