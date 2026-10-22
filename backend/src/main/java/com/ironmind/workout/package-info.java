/**
 * Training sessions and the sets registered in them.
 *
 * <p>The slice holds the session endpoints of SPEC.md section 11.4: starting a session (with
 * the copy of the exercises of a program day), the history, the exercises of the session and the
 * sets registered for them. The idempotency of the registration of a set is durable: the key
 * lives in the set itself, in a column with a unique index.
 *
 * <p>The slice also holds the domain calculations: the training volume and the one repetition
 * maximum estimate.
 */
package com.ironmind.workout;
