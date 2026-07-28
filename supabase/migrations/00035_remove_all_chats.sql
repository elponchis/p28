-- Remove all existing chats.
-- Cascade deletes chat_members, chat_messages, chat_folder_items, and chat_message_reactions.

DELETE FROM public.chats;
