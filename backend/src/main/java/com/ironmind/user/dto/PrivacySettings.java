package com.ironmind.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Visibility settings of the user.
 *
 * <p>The same shape is used in the request and in the answer. In a partial update a {@code null}
 * field means "not informed" and keeps the current value; the answer always carries the three
 * flags resolved, with the defaults of SPEC.md section 10.2 ({@code publicProfile = false},
 * {@code showRecords = true}, {@code allowSharing = false}).
 *
 * @param publicProfile whether the profile is visible to other users
 * @param showRecords   whether the personal records are visible to other users
 * @param allowSharing  whether the workout summaries can be shared
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PrivacySettings(Boolean publicProfile, Boolean showRecords, Boolean allowSharing) {

    /**
     * Visibility used when the user has no explicit setting.
     */
    public static PrivacySettings defaults() {
        return new PrivacySettings(Boolean.FALSE, Boolean.TRUE, Boolean.FALSE);
    }

    /**
     * Builds the resolved visibility settings.
     */
    public static PrivacySettings of(boolean publicProfile, boolean showRecords, boolean allowSharing) {
        return new PrivacySettings(Boolean.valueOf(publicProfile), Boolean.valueOf(showRecords),
                Boolean.valueOf(allowSharing));
    }
}
