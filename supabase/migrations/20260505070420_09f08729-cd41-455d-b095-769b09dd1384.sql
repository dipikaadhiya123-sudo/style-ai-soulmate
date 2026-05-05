-- Restore public read access for shared looks and outfits
CREATE POLICY "Public can view saved looks"
ON public.looks
FOR SELECT
USING (saved = true);

CREATE POLICY "Public can view saved outfits"
ON public.outfits
FOR SELECT
USING (saved = true);