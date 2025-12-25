import 'dotenv/config';
import appJson from './app.json';

export default ({ config }) => {
  const base = appJson.expo ?? config;

  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return {
    ...base,
    ios: {
      ...(base.ios ?? {}),
      config: {
        ...((base.ios && base.ios.config) ?? {}),
        googleMapsApiKey: key,
      },
    },
    android: {
      ...(base.android ?? {}),
      config: {
        ...((base.android && base.android.config) ?? {}),
        googleMaps: {
          ...(((base.android && base.android.config) && base.android.config.googleMaps) ?? {}),
          apiKey: key,
        },
      },
    },
  };
};
