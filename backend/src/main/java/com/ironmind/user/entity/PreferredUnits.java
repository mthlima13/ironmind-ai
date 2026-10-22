package com.ironmind.user.entity;

/**
 * Unit system preferred by the user.
 *
 * <p>The database always stores the load in kilograms: this enum only drives the presentation
 * of the application (SPEC.md section 7.2).
 */
public enum PreferredUnits {

    /**
     * Kilograms.
     */
    KG,

    /**
     * Pounds.
     */
    LB
}
