import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from './api';

export async function registerForNotifications() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SalonSlot appointments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#2ECC8F',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const token = await Notifications.getDevicePushTokenAsync();
  if (token.data) {
    await api('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify({ token: token.data, platform: Platform.OS }),
    });
  }
}
