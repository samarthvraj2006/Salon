import { ExpoConfig, ConfigContext } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesPath = process.env.GOOGLE_SERVICES_JSON;
  const googleServicesFile = googleServicesPath
    ? path.resolve(process.cwd(), googleServicesPath)
    : undefined;
  const hasGoogleServices = Boolean(googleServicesFile && fs.existsSync(googleServicesFile));
  const authMode = process.env.EXPO_PUBLIC_AUTH_MODE ?? 'mock';
  if (authMode === 'firebase' && !hasGoogleServices) {
    throw new Error('Set GOOGLE_SERVICES_JSON to your Android Firebase configuration before building with Firebase auth.');
  }

  return {
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
      backgroundColor: '#F6F8F7',
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
      ...(hasGoogleServices ? { googleServicesFile } : {}),
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      ...(hasGoogleServices ? ['@react-native-firebase/app', '@react-native-firebase/auth'] : []),
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'SalonSlot uses your location to find nearby salons.',
        },
      ],
      'expo-notifications',
    ],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:4000',
      authMode,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    },
  };
};
