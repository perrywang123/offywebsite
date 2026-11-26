## MODIFIED Requirements

### Requirement: Hero carousel with landing links

The Hero SHALL render every enabled slide in the published list's order. With no enabled slides the hero section SHALL be omitted. With exactly one enabled slide the hero SHALL render as a static linked or unlinked banner without indicators or autoplay. Default photography, copy and destinations SHALL match the original carousel. Replacements SHALL support complete banner artwork with alternative text. The Hero SHALL retain shared content-driven stable height and bottom indicators when multiple slides are enabled. Detail CTA and arrow render flags SHALL remain disabled. A manual pause control SHALL NOT be added without a separate approved change. Horizontal touch and mouse/pen drags SHALL move adjacent slides with the contact, without cross-fading or replacing the image at release. Release SHALL settle to the next/previous slide or back to the current slide using distance and recent velocity. Predominantly vertical gestures SHALL remain page scrolling; multi-touch/pointer cancellation SHALL abandon navigation and release autoplay. A drag SHALL NOT activate the full-slide link, including when dragged away and returned. Normal taps and keyboard activation SHALL retain navigation. Manual movement at either end SHALL have a bounded response without skipping through the gallery. Autoplay SHALL pause during interaction, restart after release and remain disabled for reduced motion. Reduced motion SHALL avoid animated settling while preserving manual selection.

#### Scenario: Follow the finger and settle

- **WHEN** a user drags horizontally between two home slides
- **THEN** the current and adjacent content move continuously in the same direction, and release finishes the movement without a fade/swap jump

#### Scenario: Scroll, cancel and tap

- **WHEN** a vertical gesture, multi-touch or cancellation occurs
- **THEN** it does not advance a slide or activate its link; a separate normal tap still activates the intended link

#### Scenario: Original layout retained

- **WHEN** the five screens render at phone or desktop widths and text wraps
- **THEN** the common height remains stable and copy stays clear of photography and indicators

#### Scenario: Interaction

- **WHEN** a shopper drags with mouse/pen or swipes with touch
- **THEN** the carousel follows horizontal contact and smoothly settles with click protection and vertical-intent arbitration

#### Scenario: Auto-advance and reduced motion

- **WHEN** the carousel is idle without reduced motion
- **THEN** it advances every five seconds; gestures pause/restart the timer, and reduced motion disables autoplay and animated settling

#### Scenario: Complete banner artwork with pagination

- **WHEN** at least two configured hero slides are enabled and a slide uses complete replacement artwork
- **THEN** the artwork is proportionally contained and the indicators remain below its image frame with a reserved hit area
- **AND** a single enabled slide has no indicator area

#### Scenario: More than five enabled slides

- **WHEN** the published list contains more than five enabled slides
- **THEN** every slide is selectable by its indicator and the indicators stay within the homepage width, wrapping as needed with at least 44px hit targets
- **AND** the full slide link and horizontal gestures continue to work

### Requirement: Administrator-managed homepage content

The guarded Offy admin SHALL expose 首页配置 in both accounting modes. The editor SHALL load the current published version or the current brand defaults. It SHALL add and delete hero slides, configure each hero slide's image and optional destination, and enable or disable individual hero slides and announcements. Added slides SHALL append to the draft, and removing a slide SHALL retain the remaining order. List changes SHALL take effect on publish, including empty lists. The editor SHALL configure image and destination per Latest slot and edit announcement text and the original promotion slide's copy. Links SHALL be storefront paths or HTTPS URLs. Uploaded raster images SHALL be previewable by the editor and persisted in the shared database. Authorized publishing SHALL atomically update the version and make its uploaded images publicly readable, rejecting stale edits. Published content SHALL be read by subsequent storefront requests. The settings apply to storefront presentation.

#### Scenario: First use

- **WHEN** an administrator opens the editor before any publish
- **THEN** the existing five hero images and destinations, two announcement messages and five Latest images and destinations are prefilled

#### Scenario: Save updates

- **WHEN** an administrator uploads a banner, changes its destination and publishes
- **THEN** the next storefront request uses the replacement image and destination, and the settings survive reloads

#### Scenario: Preserve other changes and prior version

- **WHEN** a second session tries to publish a stale version or submits invalid settings
- **THEN** publishing is rejected and the current storefront version remains intact

#### Scenario: Merchant access

- **WHEN** a visitor requests the guarded editor or tries to write settings without the existing administrator session and mutation checks
- **THEN** the request cannot read private editor state, upload media or publish configuration

#### Scenario: Latest feature preview

- **WHEN** an administrator previews the same feature image at mobile and desktop widths
- **THEN** the thumbnail follows the 3:4 mobile crop and approximates the taller desktop two-row crop
- **AND** it uses the storefront focal position for the original SWAN QUEEN feature image

#### Scenario: Load a previously published configuration

- **WHEN** a stored homepage configuration uses the original five positional entries
- **THEN** the editor and storefront retain their images, destinations, display switches, original layouts, and copy

#### Scenario: Remove an earlier slide and add a new one

- **WHEN** the administrator removes a slide preceding a preset and adds an image with a destination and alternative text
- **THEN** the remaining preset keeps its original layout and restore-image action
- **AND** the new image is appended and published with its own content and destination
