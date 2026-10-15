-- Supabase Storage is unavailable. Reuse existing salon assets from the repository.
-- The private recovery backup retains every original image URL.
UPDATE public.services SET image=CASE name
 WHEN 'Banho de Gel' THEN '/banho de gel.png'
 WHEN 'Alongamento Premium' THEN '/alongamento.jpg'
 WHEN 'Alongamento Simples' THEN '/alongamento em gel.png'
 WHEN 'Remoção Completa' THEN '/manicure signature.png'
 WHEN 'Esmaltação Gel - Pés' THEN '/pedicure.jpg'
 WHEN 'Esmaltação Gel - Mãos' THEN '/esmaltacao gel.jpg'
 WHEN 'Manutenção Banho de Gel' THEN '/banho de gel.png'
 WHEN 'Manutenção Premium' THEN '/manutencao premium.jpg'
 WHEN 'Manutenção Simples' THEN '/alongamento em gel.png'
 WHEN 'Reposição de Unha' THEN '/reposicao.jpg'
 ELSE image END
WHERE image LIKE 'https://gqglfeyjkmkrndqsatfr.supabase.co/%';
