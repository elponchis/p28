-- Update chats.updated_at when a new message is inserted, so chat list sorts by last activity.

CREATE OR REPLACE FUNCTION public.set_chats_updated_at_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_set_chats_updated_at
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_chats_updated_at_on_message();
