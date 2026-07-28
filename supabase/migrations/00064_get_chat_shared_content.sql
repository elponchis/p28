-- Lean fetch for chat "Media and Links": messages that have attachments, legacy images, or URLs in body.
-- RLS on chat_messages applies (SECURITY INVOKER).

CREATE OR REPLACE FUNCTION public.get_chat_shared_content(p_chat_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  body text,
  attachments jsonb,
  image_urls text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.id, m.created_at, m.body, m.attachments, m.image_urls
  FROM public.chat_messages m
  WHERE m.chat_id = p_chat_id
    AND (
      jsonb_array_length(COALESCE(m.attachments, '[]'::jsonb)) > 0
      OR cardinality(COALESCE(m.image_urls, ARRAY[]::text[])) > 0
      OR m.body ~* 'https?://'
    )
  ORDER BY m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_shared_content(uuid) TO authenticated;
