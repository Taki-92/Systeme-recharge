import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

interface NotificationState {
  notifications: Record<string, AppNotification[]>;
  addNotification: (userId: string, title: string, message: string) => void;
  markAllAsRead: (userId: string) => void;
  clearAll: (userId: string) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: {},
      
      addNotification: (userId, title, message) => set((state) => {
        const userNotifs = state.notifications[userId] || [];
        const newNotifications = [
          { id: Date.now().toString(), title, message, timestamp: Date.now(), isRead: false },
          ...userNotifs,
        ];
        return { notifications: { ...state.notifications, [userId]: newNotifications.slice(0, 50) } };
      }),
      
      markAllAsRead: (userId) => set((state) => {
        const userNotifs = state.notifications[userId] || [];
        return { notifications: { ...state.notifications, [userId]: userNotifs.map((n) => ({ ...n, isRead: true })) } };
      }),
      
      clearAll: (userId) => set((state) => ({
        notifications: { ...state.notifications, [userId]: [] }
      })),
    }),
    { name: 'notification-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);