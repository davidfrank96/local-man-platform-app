# Vendors Feature

Vendor profile, listing, featured dish, image, rating, and open-state behavior belong here.

Vendor image behavior:
- public vendor rendering depends on `vendor_images` rows, not Storage objects alone
- storage-backed image rows should include `storage_object_path` and a browser-ready `image_url`
- admin image upload and delete paths must keep `vendor_images` rows scoped to the current vendor id
- discovery vendor cards remain text-first and do not depend on vendor image payloads
