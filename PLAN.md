# KBO Monitoring Dashboard - Project Plan

## Phase 1: MVP & Core KBO Features (✅ Completed)
- [x] Basic React Setup & Layout
- [x] Integrate Naver Sports API for KBO Rankings & Schedule
- [x] Implement Player Statistics (Hitters/Pitchers)
- [x] Add Advanced Stats (FIP Calculation)
- [x] UI/UX Polishing (Horizontal Scroll, Responsive Layout, Truncation Fixes)
- [x] Premium Theme System (Dynamic Team Colors, Background Watermarks, Interactive Graph)

## Phase 2: "Korean Baseball All-in-One" Expansion (🚀 In Progress)
*Objective: Expand the platform to include Futures League, High School, and College Baseball using the same UI framework.*

### Step 1: Frontend Architecture Refactoring
- [ ] **Global Navigation**: Implement a league selector tab (KBO | 퓨처스 | 고교 | 대학) at the top level.
- [ ] **State Management**: Refactor `App.jsx` to fetch and display data based on the `selectedLeague` state.
- [ ] **Dynamic Assets**: Implement a fallback system for team logos and colors, as amateur teams will not have pre-defined assets like KBO teams.

### Step 2: Backend API Expansion & Normalization
- [ ] **Parameterization**: Update `server/index.js` endpoints to accept `league` query parameters (e.g., `/api/teams?league=high_school`).
- [ ] **Data Normalization Interface**: Ensure that regardless of the data source, the backend always returns the exact same JSON structure that the frontend expects.

### Step 3: Data Sourcing Implementation (The Challenge)
- [ ] **Futures League (퓨처스리그)**: Investigate and integrate Naver Sports API endpoints for the minor league.
- [ ] **High School Baseball (고교야구)**: Research data sources (e.g., KBSA - 대한야구소프트볼협회). Implement an HTML web scraper (`cheerio` or `puppeteer`) if public APIs are unavailable.
- [ ] **College Baseball (대학야구)**: Similarly, research and implement scraping logic for college leagues.

## Phase 3: Future Enhancements (TBD)
- [ ] User Authentication & Personalized Watchlists
- [ ] Push Notifications for Favorite Team Games
- [ ] Mobile App Porting (React Native)
