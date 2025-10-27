import { useEffect } from 'react';
import { User } from '../types';
import { useToast } from '../contexts/ToastContext';

const REMINDER_KEY = 'profileReminderShown';

/**
 * A custom hook that reminds users to complete their profile if key information is missing.
 * The reminder is a toast notification that shows once per session.
 * @param user The current logged-in user object.
 */
export const useProfileCompletionReminder = (user: User | null) => {
  const { addToast } = useToast();

  useEffect(() => {
    // 1. Don't run if there is no user.
    if (!user) {
      return;
    }

    // 2. Check if the reminder has already been shown in the current browser session.
    const hasBeenShown = sessionStorage.getItem(REMINDER_KEY);
    if (hasBeenShown) {
      return;
    }

    // 3. Define what constitutes an incomplete profile based on role.
    let isProfileIncomplete = false;
    if (user.role === 'agent' || user.role === 'admin') {
        isProfileIncomplete = !user.phone?.trim() || !user.address?.trim() || !user.bio?.trim() || !user.id_card_number?.trim();
    } else if (user.role === 'member') {
        // For members, let's stick to the key fields for the reminder.
        isProfileIncomplete = !user.phone?.trim() || !user.address?.trim() || !user.bio?.trim();
    }

    // 4. If the profile is incomplete, set a timer to show the reminder.
    if (isProfileIncomplete) {
      const timer = setTimeout(() => {
        addToast(
          'Your profile is looking a little empty! Consider updating it to help build our community.',
          'info'
        );
        // 5. Mark that the reminder has been shown for this session.
        sessionStorage.setItem(REMINDER_KEY, 'true');
      }, 15000); // Wait 15 seconds before showing the reminder.

      // Cleanup function to clear the timer if the component unmounts or user changes.
      return () => clearTimeout(timer);
    }
  }, [user, addToast]);
};
