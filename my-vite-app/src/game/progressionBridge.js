/**
 * Progression Bridge
 * Determines the tier allowed for a user based on their role and context
 */

export async function decideAllowedTier(config) {
  const { desiredTier, userId, restaurantId, role, mode } = config;
  
  // For now, return the desired tier
  // This can be extended with actual tier logic based on user role/subscription
  return {
    tierToServe: desiredTier ?? 1,
    allowed: true
  };
}
