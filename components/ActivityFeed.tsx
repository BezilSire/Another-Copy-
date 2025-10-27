import React, { useState, useEffect } from 'react';
import { User, Activity } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { ActivityItem } from './ActivityItem';
import { LoaderIcon } from './icons/LoaderIcon';

interface ActivityFeedProps {
  user: User;
  onViewProfile: (userId: string | null) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ user, onViewProfile }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!user.circle) {
      setIsLoading(false);
      return;
    }
    
    const unsubscribe = api.listenForActivity(user.circle, (acts) => {
      setActivities(acts);
      setIsLoading(false);
    }, (error) => {
      addToast("Could not load community activity.", "error");
      console.error("Activity listener error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user.circle, addToast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8 bg-slate-800 rounded-lg">
        <LoaderIcon className="h-6 w-6 animate-spin text-green-500" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 px-4 bg-slate-800 rounded-lg">
        <p>No recent activity in your circle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
      {activities.map(activity => (
        <ActivityItem 
          key={activity.id}
          activity={activity}
          onViewProfile={onViewProfile as (userId: string) => void}
        />
      ))}
    </div>
  );
};
