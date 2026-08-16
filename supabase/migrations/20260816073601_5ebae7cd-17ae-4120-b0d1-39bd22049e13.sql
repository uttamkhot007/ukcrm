CREATE TABLE public.release_floor_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID,
  event_kind TEXT NOT NULL,
  trigger TEXT,
  running_release_id TEXT NOT NULL,
  running_build_time TIMESTAMPTZ,
  floor_release_id TEXT,
  floor_build_time TIMESTAMPTZ,
  served_release_id TEXT,
  reason TEXT,
  action TEXT,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT release_floor_blocks_event_kind_check CHECK (event_kind IN ('boot_blocked','served_blocked','downgrade_prevented','floor_raised'))
);

CREATE INDEX idx_release_floor_blocks_occurred_at ON public.release_floor_blocks (occurred_at DESC);
CREATE INDEX idx_release_floor_blocks_session ON public.release_floor_blocks (session_id);
CREATE INDEX idx_release_floor_blocks_tenant ON public.release_floor_blocks (tenant_id);

GRANT INSERT ON public.release_floor_blocks TO anon;
GRANT SELECT, INSERT ON public.release_floor_blocks TO authenticated;
GRANT ALL ON public.release_floor_blocks TO service_role;

ALTER TABLE public.release_floor_blocks ENABLE ROW LEVEL SECURITY;

-- Telemetry is written by the client at boot, sometimes before sign-in.
-- Writers may only attribute a row to themselves; nobody can write on
-- behalf of another user.
CREATE POLICY "Clients can report their own release floor blocks"
ON public.release_floor_blocks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NOT DISTINCT FROM auth.uid()
  AND length(session_id) BETWEEN 8 AND 128
  AND length(running_release_id) <= 256
);

-- Only platform admins can read the stream.
CREATE POLICY "Platform admins can read release floor blocks"
ON public.release_floor_blocks
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));