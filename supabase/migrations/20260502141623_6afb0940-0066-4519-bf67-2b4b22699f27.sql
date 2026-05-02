
-- 1. Remover política permissiva que permite inserts sem login
DROP POLICY IF EXISTS "Allow insert without login" ON public.budgets;

-- 2. Limpar orçamentos órfãos (sem dono) — incluindo cascata manual
DELETE FROM public.budget_service_materials
WHERE budget_service_id IN (
  SELECT bs.id FROM public.budget_services bs
  JOIN public.budget_rooms br ON br.id = bs.room_id
  JOIN public.budgets b ON b.id = br.budget_id
  WHERE b.user_id IS NULL
);

DELETE FROM public.budget_services
WHERE room_id IN (
  SELECT br.id FROM public.budget_rooms br
  JOIN public.budgets b ON b.id = br.budget_id
  WHERE b.user_id IS NULL
);

DELETE FROM public.budget_rooms
WHERE budget_id IN (SELECT id FROM public.budgets WHERE user_id IS NULL);

DELETE FROM public.budgets WHERE user_id IS NULL;

-- 3. Tornar user_id obrigatório
ALTER TABLE public.budgets ALTER COLUMN user_id SET NOT NULL;
