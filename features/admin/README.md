# Admin Feature

Admin-only vendor management, hours, uploads, categories, dishes, visibility, and audit workflows belong here.

Vendor image upload rules:
- file selection and local preview state must be scoped to the selected vendor edit session
- switching vendors must clear pending file refs, native file input state, local object URLs, and previews
- uploaded image lists must be filtered by `vendor_id` before rendering or merging new upload responses
- upload success requires both Supabase Storage write success and a returned `vendor_images` metadata row
- upload failures must keep the admin or agent in the current workspace with visible status copy
