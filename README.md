# ai-factory-control-console — FRONTEND

The interface. Expo mobile app that drives the sovereign-factory backend.

## What's here

- `src/screens/`        — Dashboard, GodView, AgentSwarm, TruthLedger,
                          OmegaSwitch, LLMCookies, IDE
- `src/components/`     — Sidebar, TopBar, CommandPalette, IncidentRow, etc.
- `src/services/api.ts` — HTTP client → backend on port 8790
- `src/store/`          — state context
- `src/theme.ts`        — dark theme tokens

## Backend lives elsewhere

Backend + engines: **https://github.com/liky4887-stack/sovereign-factory**

This app has no server code. It calls the backend at:

    http://192.168.43.101:8790

Change the IP in `src/services/api.ts` (BASE_URL) to match your LAN host.

## Run

    npm install
    npx expo start --clear

Requires the backend running on the same LAN. See the sovereign-factory
README for backend startup.
