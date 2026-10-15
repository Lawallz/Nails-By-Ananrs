CREATE TABLE private.service_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 content bytea NOT NULL CHECK(octet_length(content) BETWEEN 1 AND 800000),
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.service_images FROM PUBLIC;
