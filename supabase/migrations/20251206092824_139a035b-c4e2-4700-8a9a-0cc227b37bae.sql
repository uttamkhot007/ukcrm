-- Add birth_date and hire_date to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS hire_date date;

-- Function to sync profile dates to employee_events
CREATE OR REPLACE FUNCTION public.sync_profile_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle birthday
  IF NEW.birth_date IS NOT NULL AND (OLD.birth_date IS NULL OR OLD.birth_date != NEW.birth_date) THEN
    -- Delete old birthday event if exists
    DELETE FROM public.employee_events 
    WHERE user_id = NEW.user_id 
    AND event_type = 'birthday' 
    AND created_by = NEW.user_id;
    
    -- Create new birthday event
    INSERT INTO public.employee_events (user_id, event_type, title, event_date, is_recurring, created_by)
    VALUES (
      NEW.user_id,
      'birthday',
      COALESCE(NEW.full_name, 'Team Member') || '''s Birthday',
      NEW.birth_date,
      true,
      NEW.user_id
    );
  ELSIF NEW.birth_date IS NULL AND OLD.birth_date IS NOT NULL THEN
    -- Remove birthday event if date is cleared
    DELETE FROM public.employee_events 
    WHERE user_id = NEW.user_id 
    AND event_type = 'birthday' 
    AND created_by = NEW.user_id;
  END IF;

  -- Handle work anniversary (hire_date)
  IF NEW.hire_date IS NOT NULL AND (OLD.hire_date IS NULL OR OLD.hire_date != NEW.hire_date) THEN
    -- Delete old anniversary event if exists
    DELETE FROM public.employee_events 
    WHERE user_id = NEW.user_id 
    AND event_type = 'anniversary' 
    AND created_by = NEW.user_id;
    
    -- Create new anniversary event
    INSERT INTO public.employee_events (user_id, event_type, title, event_date, is_recurring, created_by)
    VALUES (
      NEW.user_id,
      'anniversary',
      COALESCE(NEW.full_name, 'Team Member') || '''s Work Anniversary',
      NEW.hire_date,
      true,
      NEW.user_id
    );
  ELSIF NEW.hire_date IS NULL AND OLD.hire_date IS NOT NULL THEN
    -- Remove anniversary event if date is cleared
    DELETE FROM public.employee_events 
    WHERE user_id = NEW.user_id 
    AND event_type = 'anniversary' 
    AND created_by = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS sync_profile_events_trigger ON public.profiles;
CREATE TRIGGER sync_profile_events_trigger
  AFTER INSERT OR UPDATE OF birth_date, hire_date, full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_events();