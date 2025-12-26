#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/convoy/convoy-mobile

# Check if app.json exists
if [ -f "app.json" ]; then
  # Use node to safely inject the plugin into the JSON
  node -e '
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("app.json", "utf8"));
    
    // Ensure expo object exists
    if (!config.expo) config.expo = {};
    
    // Ensure plugins array exists
    if (!config.expo.plugins) config.expo.plugins = [];
    
    // Check if plugin already exists to avoid duplicates
    if (!config.expo.plugins.includes("@react-native-community/datetimepicker")) {
      config.expo.plugins.push("@react-native-community/datetimepicker");
      fs.writeFileSync("app.json", JSON.stringify(config, null, 2));
      console.log("Added datetimepicker plugin to app.json");
    } else {
      console.log("Plugin already exists in app.json");
    }
  '
elif [ -f "app.config.js" ]; then
    echo "You are using app.config.js. Please manually add '@react-native-community/datetimepicker' to the plugins array."
else
    echo "No app.json or app.config.js found!"
fi

echo "Done. Config updated. Please restart the server."
