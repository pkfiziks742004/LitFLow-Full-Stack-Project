import {
  createAnalyticsEvent,
  listAnalyticsEvents
} from '../repositories/systemRepository.js';

export async function logAnalyticsEvent(entry) {
  try {
    return await createAnalyticsEvent(entry);
  } catch (_error) {
    return null;
  }
}

export async function getRecentAnalytics(eventType, limit = 100) {
  return listAnalyticsEvents({ eventType, limit });
}
