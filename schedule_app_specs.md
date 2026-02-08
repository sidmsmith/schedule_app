# Appointment Calendar Application - Technical Specifications

**Version:** 0.1.1  
**Status:** Production  
**Platform:** Vercel  
**Production URL:** https://scheduleappt.vercel.app

---

## Executive Summary

The Appointment Calendar is a responsive web application that enables logistics carriers and suppliers to view availability and schedule appointments across a 5-day (Monday-Friday) grid. The application interfaces with Manhattan Associates' API infrastructure to provide real-time appointment scheduling and capacity management.

---

## Architecture Overview

### System Architecture
- **Frontend:** Vanilla JavaScript SPA with Bootstrap 5.3.3
- **Backend:** Node.js serverless functions (Vercel)
- **Deployment:** Vercel with auto-deploy from `main` branch
- **External APIs:** Manhattan Associates (Auth & Appointment APIs)
- **Analytics:** Home Assistant webhook integration

### Technology Stack
```
Frontend:
- HTML5, CSS3 (Custom CSS with CSS Variables for theming)
- JavaScript (ES6+, no frameworks)
- Bootstrap 5.3.3
- Font Awesome 6.4.0

Backend:
- Node.js (Express 5.1.0)
- node-fetch 2.6.7
- Vercel serverless functions

External Integration:
- Manhattan Associates OAuth 2.0
- Manhattan Associates Appointment API
- Home Assistant Webhook
```

---

## Application Features

### Core Functionality

#### 1. **Authentication**
- Organization-based authentication (ORG parameter)
- Default ORG: `SS-DEMO`
- OAuth 2.0 password grant flow
- JWT token management
- Auto-authentication on load

#### 2. **Calendar Grid Display**
- 5-day work week view (Monday-Friday)
- Hourly slots from 7:00 AM to 6:00 PM
- Color-coded capacity utilization:
  - **Green:** < 50% capacity
  - **Yellow:** 50-75% capacity  
  - **Red:** > 75% capacity
- Real-time occupancy display (e.g., "3/7")

#### 3. **Navigation**
- **Desktop:** Single week view with prev/next navigation
- **Mobile:** Infinite scroll with multi-week preload
- Week-by-week navigation buttons
- Day-specific jump buttons (tabs)
- Back-to-top floating button
- Smooth scroll animations

#### 4. **Appointment Scheduling**
- Click-to-schedule on available slots
- Modal form with:
  - Purchase Order (required)
  - Driver name (optional)
- Automatic calendar refresh after booking
- Visual confirmation with slot highlighting
- Optional ICS calendar file download

#### 5. **Search Functionality**
- Multi-appointment ID search
- Supports space, comma, or semicolon delimiters
- Highlights matching appointments with pulsing animation
- Scrolls to first match
- Mobile-optimized collapsed search bar

#### 6. **Theming System**
- 6 pre-built themes:
  - Default (Dark)
  - Love's Travel Stops
  - Manhattan Associates
  - MSC Industrial
  - Corporate Blue
  - Minimal Light (default)
- Theme persistence via localStorage
- Accessible theme selector modal

#### 7. **Analytics & Tracking**
- Home Assistant webhook integration
- Tracked events:
  - `app_opened` (with device type)
  - `auth_success`
  - `schedule_attempted`
  - `schedule_confirmed`

---

## API Architecture

### Backend Endpoints

#### `/api/validate` (POST)
**Single unified endpoint for all operations**

##### Actions:

1. **`app_opened`**
   ```json
   {
     "action": "app_opened",
     "device_type": "mobile|browser"
   }
   ```

2. **`auth`**
   ```json
   {
     "action": "auth",
     "org": "SS-DEMO"
   }
   ```
   Response:
   ```json
   {
     "success": true,
     "token": "eyJhbGc..."
   }
   ```

3. **`calendar-data`**
   ```json
   {
     "action": "calendar-data",
     "org": "SS-DEMO",
     "date": "2025-11-16",
     "resourceGroups": [
       {
         "ResourceGroupName": "Dock",
         "ResourceUnits": [{ "ResourceId": "Dock 1" }]
       }
     ]
   }
   ```
   Response:
   ```json
   {
     "data": {
       "GridData": [{
         "ResourceGroupName": "Dock",
         "ResourceUnits": [{
           "ResourceId": "Dock 1",
           "IntervalCapacities": [{
             "IntervalStart": "2025-11-16T12:00:00",
             "IntervalEnd": "2025-11-16T13:00:00",
             "Capacity": 7,
             "TotalAppointment": 3,
             "CapacityUtilization": 43,
             "AppointmentIds": ["APT00123", "APT00124", "APT00125"]
           }]
         }]
       }]
     }
   }
   ```

4. **`schedule-appointment`**
   ```json
   {
     "action": "schedule-appointment",
     "org": "SS-DEMO",
     "preferredDateTime": "2025-11-16T12:00:00"
   }
   ```
   Payload to Manhattan API:
   ```json
   {
     "AppointmentTypeId": "DROP_UNLOAD",
     "EquipmentTypeId": "48FT",
     "PreferredDateTime": "2025-11-16T12:00:00",
     "Duration": 60,
     "AppointmentStatusId": "3000"
   }
   ```

5. **`schedule_attempted`**
   ```json
   {
     "action": "schedule_attempted",
     "org": "SS-DEMO"
   }
   ```

### Manhattan Associates API Integration

#### Authentication Endpoint
```
POST https://salep-auth.sce.manh.com/oauth/token
Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}
Content-Type: application/x-www-form-urlencoded

grant_type=password
username=sdtadmin@{org}
password=Blu3sk!es2300
```

#### Calendar Data Endpoint
```
POST https://salep.sce.manh.com/appointment/api/appointment/calendarData
Authorization: Bearer {token}
selectedOrganization: {org}
selectedLocation: {org}-DM1
```

#### Schedule Appointment Endpoint
```
POST https://salep.sce.manh.com/appointment/api/appointment/scheduleAppointment
Authorization: Bearer {token}
selectedOrganization: {org}
selectedLocation: {org}-DM1
```

---

## Data Models

### Slot Lookup Structure
```javascript
Map<string, SlotInfo>
// Key format: "YYYY-MM-DDTHH:00"

interface SlotInfo {
  capacity: number;
  capacityUtilization: number;
  totalAppointments: number;
  appointmentIds: string[];
}
```

### Week Data Structure
```javascript
Map<string, boolean>
// Key format: "YYYY-MM-DD" (ISO week start date)
// Value: true if loaded
```

### Appointment Cell Map
```javascript
Map<string, HTMLElement>
// Key: Normalized appointment ID (uppercase)
// Value: DOM reference to slot button
```

---

## Key Application Logic

### Time Zone Handling
- **Display Offset:** -5 hours (EST/CDT)
- All times displayed in local facility time
- API calls use UTC timestamps
- Conversion applied on slot rendering and scheduling

### Week Management
- **Desktop Mode:** Single active week, replaced on navigation
- **Mobile Mode:** Infinite scroll with 4-week preload
- Max buffer: 8 weeks in memory
- Auto-refresh every 3 minutes

### Slot Visibility Rules
```javascript
hideSlot = (capacity === 0) || (totalAppointments >= capacity) || (isPastSlot)
```

### Utilization Color Coding
```javascript
if (utilization < 50) return 'green';
if (utilization <= 75) return 'yellow';
return 'red'; // > 75%
```

---

## Responsive Design

### Breakpoints
- **Mobile:** ≤ 768px
- **Desktop:** > 768px

### Mobile-Specific Behaviors
1. Card zoom removed (transform: none)
2. Day headers sticky positioned
3. Previous Week button hidden
4. Search bar collapsible
5. Infinite scroll enabled
6. 4-week preload buffer
7. Navigation advances exactly 1 week per tap

### Desktop-Specific Behaviors
1. 0.612 scale transform on card
2. Single week display
3. Both nav buttons visible
4. No infinite scroll
5. Theme selector visible

---

## Configuration

### Environment Variables (Vercel)
```
MANHATTAN_PASSWORD
MANHATTAN_SECRET
ORG (e.g., SS-DEMO)
```

### Constants
```javascript
DAY_COUNT = 5              // Mon-Fri
WEEK_STEP = 7              // Days per week jump
START_HOUR = 7             // 7:00 AM
END_HOUR = 18              // 6:00 PM
DISPLAY_OFFSET_HOURS = -5  // Time zone offset
HIGHLIGHT_DURATION = 5000  // ms
AUTO_REFRESH_INTERVAL = 180000 // 3 minutes
MAX_WEEKS_BUFFER = 8       // Memory limit
```

### Mock Mode
- Enabled via URL parameter: `?mock=1`
- Bypasses authentication
- Generates synthetic calendar data
- Useful for UI testing and demos

---

## User Workflows

### 1. Initial Load
```
1. Load theme from localStorage
2. Send app_opened event to HA
3. Auto-populate ORG field with "SS-DEMO"
4. Auto-authenticate
5. Load current week + 3 additional weeks (mobile) or 1 week (desktop)
6. Render calendar grid
7. Start auto-refresh timer
```

### 2. Scheduling an Appointment
```
1. User clicks available time slot
2. Send schedule_attempted event to HA
3. Modal opens with pre-filled time
4. User enters Purchase Order (required)
5. User optionally enters Driver name
6. User clicks Confirm
7. API call to schedule-appointment
8. Send schedule_confirmed event to HA
9. Modal closes, confirmation modal opens
10. Calendar refreshes for that day
11. Slot highlights with pulsing animation
12. Optional ICS file downloads if enabled
```

### 3. Searching Appointments
```
1. User enters appointment IDs (space/comma/semicolon separated)
2. IDs normalized to uppercase
3. Lookup in appointmentCellMap
4. Matching slots highlighted and scrolled into view
5. Legend dot pulses for utilization level
6. Error shown if no matches found
```

---

## Performance Optimizations

1. **Slot Lookup Caching:** In-memory Map for O(1) lookups
2. **DOM Batching:** Document fragments for calendar rendering
3. **Lazy Loading:** Infinite scroll loads weeks on demand
4. **Debounced Scroll:** Back-to-top and infinite scroll throttled
5. **Animation Delays:** Staggered column fade-in (50ms per column)
6. **Week Capping:** 8-week memory limit prevents unbounded growth

---

## Security Considerations

1. **OAuth 2.0 Token Management:** JWT tokens in memory, not persisted
2. **CORS Headers:** Configured via Vercel
3. **No Client-Side Secrets:** Credentials stored as Vercel environment variables
4. **Input Validation:** PO field required, prevents empty submissions
5. **XSS Protection:** All user input sanitized via textContent

---

## Known Limitations

1. **Single Resource Group:** Hardcoded to "Dock 1"
2. **Fixed Appointment Type:** Always "DROP_UNLOAD" with "48FT" equipment
3. **No Edit/Cancel:** Appointments cannot be modified after scheduling
4. **No User Management:** Single-user system per ORG
5. **Weekend Handling:** Always jumps to next Monday if current day is Sat/Sun

---

## Future Enhancement Opportunities

1. Multi-dock support with resource group selection
2. Appointment editing and cancellation
3. Custom appointment types and equipment
4. User role management (carrier vs. facility)
5. Appointment history and reporting
6. Email/SMS notifications
7. Recurring appointment templates
8. Multi-language support
9. Offline mode with service workers
10. Advanced filtering and sorting

---

## Development & Deployment

### Local Development
```bash
npm install
npm run dev  # Runs Vercel dev server
```

### Mock Mode Testing
```
http://localhost:3000/?mock=1
```

### Production Deployment
```bash
git push origin main  # Auto-deploys to Vercel
```

### Monitoring
- Vercel logs for API requests
- Home Assistant for user analytics
- Browser console for client-side debugging

---

## Browser Support

- **Chrome/Edge:** 90+
- **Firefox:** 88+
- **Safari:** 14+
- **Mobile Safari:** 14+
- **Chrome Android:** 90+

---

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support (Enter key triggers)
- Focus indicators on slots
- Screen reader compatible slot titles
- High contrast theme options
- Semantic HTML structure

---

## Change Log

### v0.1.1 (Current)
- Mobile next/prev buttons advance exactly 1 week
- Confirmation modal closes only via Close button
- Scheduled slots get flashing halo highlight
- Mobile collapsed search width increased
- Production deployment to Vercel

---

## Contact & Support

For issues or questions, refer to:
- GitHub Repository: `sidmsmith/schedule_app`
- Vercel Dashboard: Project settings
- Manhattan API Documentation: Internal docs