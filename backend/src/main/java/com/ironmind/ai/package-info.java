/**
 * Integration with the language model (SPEC.md section 11.6 and 12).
 *
 * <p>The model is only reachable through the backend: the key never reaches the mobile application
 * and the model never writes to the database. The flow is fixed and applies to every feature: the
 * backend builds a minimum context, the provider proposes, the backend validates the answer
 * against the catalog and the limits, and the user reviews before anything is persisted.
 *
 * <p>The provider is selected by {@code app.llm.provider}: {@code mock} answers deterministically
 * and needs no credential, {@code openai} calls the real API. The load suggestion is rule based
 * and does not call the model at all (SPEC.md section 12.3).
 */
package com.ironmind.ai;
