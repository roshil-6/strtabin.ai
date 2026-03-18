# Stratabin Mobile App (Flutter)

Native mobile app for Stratabin Strategy Box, rebuilt with Flutter for a better mobile experience.

## Features

- **Dashboard** – Project cards, folders, quick access to workflow map
- **Flow Canvas** – Workflow map with pan/zoom
  - **Add Box** – Add new workflow steps
  - **Branch** – Add a connected node from selected node
  - **Option** – Split into Option A / Option B
  - **Idea** – Add idea nodes
- **Write** – Strategy writing area
- **Tasks** – Task list
- **STRAB** – AI assistant (placeholder)

## Prerequisites

1. Install [Flutter](https://docs.flutter.dev/get-started/install)
2. Run `flutter doctor` to ensure everything is set up

## Setup

```bash
cd mobile
flutter create . --project-name stratabin_mobile   # Generate android/ios folders (run once)
flutter pub get
```

## Run

```bash
# Android
flutter run

# iOS (macOS only)
flutter run -d ios

# Web (for preview)
flutter run -d chrome
```

## Connect to Backend

Set the API base URL in your environment or in a config file. The backend runs at `http://localhost:3001` by default. For a physical device, use your machine's IP (e.g. `http://192.168.1.x:3001`).

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart           # App entry, theme
│   ├── app.dart
│   ├── providers/
│   │   ├── app_state.dart  # App state (nav, project)
│   │   └── flow_state.dart # Flow nodes/edges
│   ├── screens/
│   │   ├── app_shell.dart   # Bottom nav shell
│   │   ├── dashboard_screen.dart
│   │   ├── flow_screen.dart # Flow canvas + Add Box/Option
│   │   ├── write_screen.dart
│   │   ├── tasks_screen.dart
│   │   └── strab_screen.dart
│   └── widgets/
│       ├── project_card.dart
│       ├── flow_canvas.dart
│       └── flow_action_bar.dart
├── pubspec.yaml
└── README.md
```

## Flow Actions (Mobile-First)

All flow actions are always visible in the bottom action bar:

| Action   | Description                                      |
|----------|--------------------------------------------------|
| Add Box  | Add a new workflow step                          |
| Branch   | Add a connected node from the selected node      |
| Option   | Split selected node into Option A and Option B   |
| Idea     | Add an idea node                                 |

**Option** requires a node to be selected first. Tap a node to select it, then tap **Option**.
