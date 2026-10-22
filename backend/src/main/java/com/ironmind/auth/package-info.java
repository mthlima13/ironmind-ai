/**
 * Authentication and authorization of the API.
 *
 * <p>The slice implements the token strategy of SPEC.md section 14.1: the access token is a
 * stateless JWT with a short lifetime and the refresh token is an opaque credential, stored
 * only as a hash, rotated on every renewal, with detection of the reuse that revokes the whole
 * family of the session. The password is hashed with Argon2id and the recovery of the access
 * uses a single use token of thirty minutes.
 *
 * <p>The sub packages are organized by concern: {@code dto} for the contracts of the API,
 * {@code entity} and {@code repository} for the tokens, {@code service} for the rules of the
 * flow, {@code password} for the hash and the policy of the password, {@code mail} for the
 * delivery of the recovery message and {@code ratelimit} for the limit of the attempts.
 */
package com.ironmind.auth;
