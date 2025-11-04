import { useEffect } from 'react';
import { User } from '../types';

// This hook is disabled as part of the feature rollback.
export const usePushNotifications = (user: User | null) => {
  useEffect(() => {
    // Intentionally empty.
  }, [user]);
};
