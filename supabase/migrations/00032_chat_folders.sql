-- Chat folders: user-defined folders to organize chats. Stored in DB for sync across devices.

CREATE TABLE public.chat_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_folder_items (
  folder_id UUID NOT NULL REFERENCES public.chat_folders(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (folder_id, chat_id)
);

CREATE INDEX idx_chat_folders_user_id ON public.chat_folders(user_id);
CREATE INDEX idx_chat_folder_items_folder_id ON public.chat_folder_items(folder_id);
CREATE INDEX idx_chat_folder_items_chat_id ON public.chat_folder_items(chat_id);

ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat folders"
  ON public.chat_folders FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own folder items"
  ON public.chat_folder_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_folders cf
      WHERE cf.id = chat_folder_items.folder_id AND cf.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_folders cf
      WHERE cf.id = chat_folder_items.folder_id AND cf.user_id = auth.uid()
    )
  );
