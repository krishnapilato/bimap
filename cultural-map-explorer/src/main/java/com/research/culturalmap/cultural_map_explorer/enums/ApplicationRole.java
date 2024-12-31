package com.research.culturalmap.cultural_map_explorer.enums;

/**
 * Defines the roles available in the application.
 * Roles are used to manage user permissions and access levels.
 */
public enum ApplicationRole {

    USER,

    MANAGER,

    ADMINISTRATOR;

    /**
     * Checks if the role has higher or equal permissions compared to another role.
     *
     * @param otherRole The role to compare against.
     * @return True if the current role has higher or equal permissions, otherwise false.
     */
    public boolean hasEqualOrHigherPermissionsThan(ApplicationRole otherRole) {
        return this.ordinal() >= otherRole.ordinal();
    }

    /**
     * Converts a string to its corresponding ApplicationRole.
     *
     * @param role The string representation of the role.
     * @return The matching ApplicationRole, or null if no match is found.
     */
    public static ApplicationRole fromString(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }
        try {
            return ApplicationRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}