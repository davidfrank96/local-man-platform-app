## Title
The Local Man — Product Requirements Document

## Product Summary
The Local Man is a location-based food discovery platform designed to help people find nearby local and underrepresented food vendors that are often not listed on mainstream delivery apps.

The product is designed first for Abuja, Nigeria, with a focus on informal roadside vendors, neighborhood kitchens, breakfast sellers, lunch vendors, night food spots, and small local businesses that depend heavily on physical discovery and local visibility.

## Problem
Mainstream delivery platforms mainly support structured, digitized restaurants. Many local food businesses in Nigeria are not discoverable online even though they serve large numbers of people daily.

Users often struggle to find:
- cheap nearby local food
- open vendors at the right time of day
- informal food sellers in a specific area
- lesser-known vendors with good food
- quick pick-up food options around them

## Product Vision
Enable people to discover nearby local food vendors quickly through a map-based experience and help small local vendors gain visibility without requiring them to join complex delivery ecosystems.

## MVP Goal
A user opens the app, sees nearby food vendors on a map, views what they sell, sees whether they are open, sees how far they are, and can either call the vendor or get directions.

## Launch Geography
Pilot city: Abuja, Nigeria

Initial focus areas:
- Guzape
- Wuse
- Garki
- Jabi
- Maitama
- Utako
- Lugbe

## Primary Users
### Buyers
People looking for:
- nearby local meals
- budget-friendly meals
- breakfast, lunch, dinner, or late-night food
- local vendors not shown on major platforms

### Vendors
Small food businesses with:
- low digital presence
- no delivery infrastructure
- limited marketing reach
- strong local relevance

## User Stories
1. As a user, I want to see nearby food vendors on a map so I can quickly decide where to go.
2. As a user, I want to know whether a vendor is open so I do not waste time.
3. As a user, I want to see distance in kilometers so I know how close the vendor is.
4. As a user, I want to see featured dishes and clear vendor cues so I can choose where to eat quickly.
5. As a user, I want to call the vendor so I can confirm availability or reserve food.
6. As a user, I want directions so I can navigate there easily.
7. As an admin, I want to manually manage vendor data so listings stay accurate.

## MVP Features
### Public User Features
- current location detection
- nearby vendor map
- vendor list below map
- vendor detail page
- search by vendor, dish, or area
- filtering by radius, category, price, and open now
- call vendor button
- directions button
- ratings display
- no-image vendor cards on discovery surfaces for faster loading and scanning

### Admin Features
- admin-only login
- vendor CRUD
- vendor hours management
- vendor image upload
- vendor category assignment
- featured dishes management
- active/inactive visibility toggle
- manual open/closed override
- audit log for edits

## Out of Scope for MVP
- delivery logistics
- online payments
- wallets
- vendor self-signup
- public user login
- chat
- loyalty system
- recommendation engine
- coupon/promo engine
- social features
- inventory system
- multi-country rollout

## Success Metrics
### User Metrics
- map opens
- vendor detail views
- directions clicks
- call clicks
- search usage

### Vendor Metrics
- active vendors listed
- vendor profile views
- vendor contact actions

### Operational Metrics
- vendor location accuracy
- hours accuracy
- image completeness
- admin data completion rate

## MVP Constraints
- web-first build
- no public user authentication in v1
- admin-curated vendor database
- clean and fast mobile experience
- low operational complexity
