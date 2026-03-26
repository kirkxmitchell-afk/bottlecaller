/**
 * Progression Store
 * Manages progression and tier data for users
 */

export function createProgressionStore() {
  return {
    init(config) {
      const { email, license, groupId } = config;
      // Return a progression spine object with necessary structure
      return {
        email,
        license,
        groupId,
        tier: 1,
        progress: {}
      };
    }
  };
}
