UPDATE public.public_branding pb
SET branding_json = sub.branding,
    primary_hex   = COALESCE(sub.branding->>'primaryColor', pb.primary_hex),
    logo_url      = COALESCE(sub.branding->>'logoUrl',      pb.logo_url),
    favicon_url   = COALESCE(sub.branding->>'faviconUrl',   pb.favicon_url),
    updated_at    = now()
FROM (
  SELECT cc.config->'branding' AS branding
  FROM public.client_configs cc
  JOIN public.user_roles ur ON ur.user_id = cc.user_id
  WHERE ur.role IN ('admin','superadmin')
    AND cc.config ? 'branding'
  ORDER BY cc.updated_at DESC
  LIMIT 1
) sub
WHERE pb.id = 'singleton';