CREATE TABLE IF NOT EXISTS public.chatbot_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL DEFAULT 'default',
  knowledge_text VARCHAR(1000) NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT chatbot_knowledge_singleton CHECK (slug = 'default'),
  CONSTRAINT chatbot_knowledge_slug_unique UNIQUE (slug),
  CONSTRAINT chatbot_knowledge_text_length CHECK (char_length(knowledge_text) <= 1000)
);

INSERT INTO public.chatbot_knowledge (slug, knowledge_text)
VALUES ('default', '')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view chatbot knowledge"
  ON public.chatbot_knowledge
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert chatbot knowledge"
  ON public.chatbot_knowledge
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update chatbot knowledge"
  ON public.chatbot_knowledge
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete chatbot knowledge"
  ON public.chatbot_knowledge
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_chatbot_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chatbot_knowledge_timestamp ON public.chatbot_knowledge;

CREATE TRIGGER update_chatbot_knowledge_timestamp
  BEFORE UPDATE ON public.chatbot_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_knowledge_updated_at();
