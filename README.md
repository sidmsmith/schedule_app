# Appointment Calendar

Version: v0.1.0

Status: Production (moved out of Development on Apps Homepage)

## Overview
Appointment Calendar is a responsive web and mobile scheduling UI that displays a 5-day grid of hourly availability, supports week navigation, search, and appointment scheduling with optional ICS downloads.

## Notable in v0.1.0
- Mobile next/prev buttons advance exactly one week regardless of preloaded weeks or scroll.
- Confirmation modal closes only via Close button; backdrop clicks are ignored.
- Scheduled slots get the same flashing halo highlight as search results.
- Mobile collapsed search width increased for usability.

## Deployments
- Platform: Vercel
- Production URL: https://scheduleappt.vercel.app
- Branch: main (auto-deploys on push)

## Environment Variables (Vercel)
- MANHATTAN_PASSWORD
- MANHATTAN_SECRET
- ORG (e.g., SS-DEMO)

## Development
- Local mock mode available via `?mock=1` flag to view populated calendar without live auth.

## License
Proprietary – internal use.


