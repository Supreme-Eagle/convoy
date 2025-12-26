#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/convoy/convoy-mobile

# Ensure assets folder exists
mkdir -p assets

# Download default Expo assets (Icon, Splash, Adaptive)
curl -o assets/icon.png https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/icon.png
curl -o assets/splash.png https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/splash.png
curl -o assets/adaptive-icon.png https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/adaptive-icon.png
curl -o assets/favicon.png https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-blank/assets/favicon.png

echo "Restored default assets. Run: npx expo start --tunnel --clear"
