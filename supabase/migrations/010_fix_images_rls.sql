-- HouseOS Migration 010: Fix property_images RLS for public read access
-- Server components use anon key which is not "authenticated" - need public SELECT policy

-- Allow public SELECT on property_images (anon key needs this for server components)
CREATE POLICY "Allow public SELECT on property_images" ON property_images
  FOR SELECT TO anon USING (true);

-- Also allow service_role to bypass RLS entirely (already implicit, but explicit for clarity)
CREATE POLICY "Allow service_role all on property_images" ON property_images
  FOR ALL TO service_role USING (true) WITH CHECK (true);
