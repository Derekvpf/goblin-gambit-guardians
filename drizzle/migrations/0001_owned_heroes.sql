CREATE TABLE public.owned_heroes (
  user_id uuid NOT NULL,
  hero_id text NOT NULL,
  obtained_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hero_id)
);
GRANT SELECT ON public.owned_heroes TO authenticated;
GRANT ALL ON public.owned_heroes TO service_role;
ALTER TABLE public.owned_heroes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.owned_heroes FOR SELECT TO authenticated USING (auth.uid() = user_id);