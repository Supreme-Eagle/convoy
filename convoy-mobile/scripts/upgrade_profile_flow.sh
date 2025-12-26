#!/usr/bin/env bash
set -euo pipefail

# 1. Fix Profile Screen Import
# Changes "../../firebaseConfig" to "../../src/firebase"
sed -i 's|../../firebaseConfig|../../src/firebase|g' "app/(tabs)/profile.tsx"

# 2. Fix AuthProvider Import
# Changes "../../firebaseConfig" to "../firebase"
sed -i 's|../../firebaseConfig|../firebase|g' "src/auth/AuthProvider.tsx"

echo "✅ Code Fixed: Imports now point to src/firebase"
echo "Run: npx expo start --clear"
