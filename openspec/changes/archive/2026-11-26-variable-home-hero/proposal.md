## Why

The homepage editor fixes the carousel to five original positions. Operators need to add and remove hero images as campaigns change.

## What Changes

- Add and delete hero images in 首页配置. Append new images and retain the order of the remaining images. Apply edits on publish.
- Preserve the original artwork, copy, and destinations of existing configurations. Keep the original layouts and restore-image action associated with their own slides.
- Render the published, enabled slides. Omit the hero at zero, show a static hero at one, and keep pagination and swipe for multiple slides.

## Capabilities

### Modified Capabilities

- `brand-site`: configurable hero slide count and responsive pagination.

## Impact

- Home content validation, hero rendering, and the admin 首页配置 editor.
- Existing homepage JSON remains readable. The current publishing, image storage, and revision checks serve the variable list.
