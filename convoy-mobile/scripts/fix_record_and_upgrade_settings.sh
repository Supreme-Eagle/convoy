#!/usr/bin/env bash
set -euo pipefail

# Update import path in app/auth.tsx
# From: "../../src/auth/AuthProvider" (Wrong for root file)
# To:   "../src/auth/AuthProvider"   (Correct for root file)

sed -i 's|../../src/auth/AuthProvider|../src/auth/AuthProvider|g' "app/auth.tsx"

echo "✅ Import path fixed in app/auth.tsx."
echo "Run: npx expo start --clear"
