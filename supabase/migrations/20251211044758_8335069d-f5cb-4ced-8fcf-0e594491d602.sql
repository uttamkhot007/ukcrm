-- Create table for tracking active calls
CREATE TABLE public.video_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL DEFAULT 'video' CHECK (call_type IN ('video', 'voice', 'screen_share')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  room_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT
);

-- Create table for WebRTC signaling
CREATE TABLE public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_calls
CREATE POLICY "Users can view their own calls" 
ON public.video_calls 
FOR SELECT 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls" 
ON public.video_calls 
FOR INSERT 
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own calls" 
ON public.video_calls 
FOR UPDATE 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- RLS policies for webrtc_signals
CREATE POLICY "Users can view signals meant for them" 
ON public.webrtc_signals 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create signals" 
ON public.webrtc_signals 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update signals meant for them" 
ON public.webrtc_signals 
FOR UPDATE 
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete processed signals" 
ON public.webrtc_signals 
FOR DELETE 
USING (auth.uid() = receiver_id AND processed = true);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_calls;

-- Create indexes for performance
CREATE INDEX idx_video_calls_caller ON public.video_calls(caller_id);
CREATE INDEX idx_video_calls_callee ON public.video_calls(callee_id);
CREATE INDEX idx_video_calls_status ON public.video_calls(status);
CREATE INDEX idx_webrtc_signals_receiver ON public.webrtc_signals(receiver_id, processed);
CREATE INDEX idx_webrtc_signals_call ON public.webrtc_signals(call_id);