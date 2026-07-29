import { getUserSchedules } from "./conditionPlans";
import { getRecentActivities } from "./recentActivity";

export async function buildHealthMemoryContext() {
  const [recentActivities, schedules] = await Promise.all([
    getRecentActivities(),
    getUserSchedules(),
  ]);

  return {
    recentActivities: recentActivities.slice(0, 12),
    schedules: schedules.slice(0, 12),
  };
}
