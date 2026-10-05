import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SalonSlot',
  slug: 'salonslot',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'salonslot',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F5B3E',
  },
  android: {
    package: 'app.salonslot.customer',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F5B3E',
    },
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'SalonSlot uses your location to find nearby salons.',
      },
    ],
    'expo-notifications',
  ],
  extra: {
    eas: {
      projectId: 'salonslot-demo',
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000',
    authMode: process.env.EXPO_PUBLIC_AUTH_MODE ?? 'mock',
  },
});
