ALTER TABLE public.categories
  ADD CONSTRAINT categories_name_max_length CHECK (char_length(name) <= 40);