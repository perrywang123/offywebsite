## ADDED Requirements

### Requirement: Touch event ownership for media rails

Home and product media rails SHALL retain a touch-owned gesture until that touch stream ends or is explicitly canceled. A compatibility Pointer Event, including release of implicit touch pointer capture, SHALL NOT cancel or settle a touch-owned gesture. Mouse/pen release and capture-loss handling SHALL affect only the owning pointer. A completed horizontal touch exceeding the distance threshold or meeting the recent-velocity threshold SHALL select exactly one adjacent image and settle to its complete viewport boundary. Short gestures and canceled interactions SHALL return to the original complete viewport boundary. Repeated swipes SHALL remain operable, and vertical scrolling and native multi-touch behavior SHALL remain available.

#### Scenario: Touch release also loses implicit pointer capture

- **WHEN** a horizontal touch gesture receives pointerup/lostpointercapture compatibility events before touchend
- **THEN** touchend still computes its destination and the rail settles exactly on the adjacent image, without sticking between images or returning due to the unrelated pointer capture notification

#### Scenario: Pointer ownership and real cancellation

- **WHEN** another pointer loses capture, or the actual touch stream is canceled
- **THEN** the unrelated pointer cannot cancel the active gesture, while a real touch cancellation returns to the original image and releases the interaction state
