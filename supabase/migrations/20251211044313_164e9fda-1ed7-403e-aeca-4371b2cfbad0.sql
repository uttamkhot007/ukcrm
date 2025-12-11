-- Create chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat participants table
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Create chat messages table with auto-delete policy
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '90 days')
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view conversations they participate in"
ON public.chat_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_participants.conversation_id = chat_conversations.id 
    AND chat_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants of their conversations"
ON public.chat_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = chat_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Conversation creators can add participants"
ON public.chat_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = conversation_id AND created_by = auth.uid()
  ) OR user_id = auth.uid()
);

CREATE POLICY "Users can update their own participation"
ON public.chat_participants FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.conversation_id = chat_messages.conversation_id
    AND chat_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_participants.conversation_id = chat_messages.conversation_id
    AND chat_participants.user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create index for faster queries
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_expires_at ON public.chat_messages(expires_at);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);

-- Function to auto-delete expired messages (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM public.chat_messages WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;