## MODIFIED Requirements

### Requirement: Hero carousel with landing links

The Hero SHALL retain its five original photographs, live copy, full-slide destinations, shared content-driven stable height and bottom indicators. Detail CTA and arrow render flags SHALL remain disabled. A manual pause control SHALL NOT be added without a separate approved change. Horizontal touch and mouse/pen drags SHALL move adjacent slides with the contact, without cross-fading or replacing the image at release. Release SHALL settle to the next/previous slide or back to the current slide using distance and recent velocity. Predominantly vertical gestures SHALL remain page scrolling; multi-touch/pointer cancellation SHALL abandon navigation and release autoplay. A drag SHALL NOT activate the full-slide link, including when dragged away and returned. Normal taps and keyboard activation SHALL retain navigation. Manual movement at either end SHALL have a bounded response without skipping through the gallery. Autoplay SHALL pause during interaction, restart after release and remain disabled for reduced motion. Reduced motion SHALL avoid animated settling while preserving manual selection.

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

## ADDED Requirements

### Requirement: Swipeable product media

The product gallery SHALL allow horizontal touch swipes and primary-pointer drags through the current product's Shopify-supplied images, settling smoothly and keeping thumbnails/current-image status synchronized. It SHALL preserve the current object-contain image presentation, responsive aspect ratio and existing thumbnail controls. A short abandoned drag SHALL return to the current image. First/last images SHALL have bounded non-wrapping behavior. Vertical scrolling and native pinch zoom SHALL remain available. Canceled or multi-touch gestures SHALL NOT choose a new image. Keyboard controls SHALL offer previous/next selection without intercepting keys from unrelated controls. Single-image and empty galleries SHALL remain safe. A changed image set SHALL reset selection and in-progress interaction without showing the previous product's images.

#### Scenario: Swipe and use thumbnails

- **WHEN** a user swipes to another product image and then chooses a thumbnail
- **THEN** both the main image and selected thumbnail follow the same selection

#### Scenario: Boundaries and interruption

- **WHEN** the user drags beyond an endpoint, cancels the gesture, changes products or uses multiple contacts
- **THEN** no out-of-range image, accidental navigation or stuck dragging state occurs

#### Scenario: Accessible and reduced motion

- **WHEN** a keyboard user changes images or the system requests reduced motion
- **THEN** selection remains operable, only active content is exposed, and settling does not require animation
