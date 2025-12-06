-- Add sound and quiet hours settings to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN sound_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN sound_type text NOT NULL DEFAULT 'default',
ADD COLUMN quiet_hours_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN quiet_hours_start time NOT NULL DEFAULT '22:00:00',
ADD COLUMN quiet_hours_end time NOT NULL DEFAULT '08:00:00';