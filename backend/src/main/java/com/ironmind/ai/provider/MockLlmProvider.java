package com.ironmind.ai.provider;

import com.ironmind.ai.schema.VoiceInterpretationPayload;
import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.program.entity.SplitType;
import com.ironmind.user.entity.TrainingGoal;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic provider used by the development environment and by the automated tests.
 *
 * <p>It needs no credential and never spends credits. The answer mimics the shape and the
 * conservatism expected from the real model, so the whole flow (validation, review and
 * persistence) can be exercised without an external call.
 *
 * <p>The text of the answer is in Portuguese because it is shown to the user; the code and the
 * comments stay in English.
 */
public class MockLlmProvider implements LlmProvider {

    /**
     * Identifier reported as the model of this provider.
     */
    public static final String MODEL_NAME = "mock-ironmind-v1";

    private static final int MAX_EXERCISES_PER_DAY = 5;
    private static final int MAX_DISTINCT_GROUPS_IN_DAY_NAME = 3;

    private static final Pattern WEIGHT = Pattern.compile(
            "(\\d{1,3}(?:[.,]\\d{1,2})?)\\s*(?:kg|quilos?|kilos?)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern REPETITIONS = Pattern.compile(
            "(\\d{1,2})\\s*(?:reps?|repeti[cç][oõ]es|repeticoes)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern DURATION = Pattern.compile(
            "(\\d{1,3})\\s*(?:segundos?|seg)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern DISTANCE = Pattern.compile(
            "(\\d{1,4}(?:[.,]\\d{1,2})?)\\s*(?:metros?|m)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern SEGMENT_SEPARATOR = Pattern.compile("\\s*[;\\n]+\\s*");

    @Override
    public String modelName() {
        return MODEL_NAME;
    }

    @Override
    public WorkoutProposalPayload proposeWorkout(AiContext context, String request) {
        if (context.catalog().isEmpty()) {
            throw new LlmSchemaException("The visible catalog is empty.");
        }

        TrainingGoal goal = context.goal() == null ? TrainingGoal.GENERAL : context.goal();
        Prescription prescription = Prescription.forGoal(goal);
        boolean splitChosenByUser = context.splitType() != null;
        SplitType split = resolveSplit(context);

        List<AiContext.CatalogExercise> pool = new ArrayList<>(context.catalog());
        pool.sort(Comparator
                .comparingInt((AiContext.CatalogExercise exercise) ->
                        exercise.movementType() == MovementType.COMPOUND ? 0 : 1)
                .thenComparing(exercise -> nullToEmpty(exercise.primaryMuscleGroup()))
                .thenComparing(exercise -> nullToEmpty(exercise.name())));

        int days = Math.max(1, Math.min(context.trainingDays() <= 0 ? 3 : context.trainingDays(), pool.size()));
        int base = pool.size() / days;
        int remainder = pool.size() % days;

        List<WorkoutProposalPayload.Day> proposedDays = new ArrayList<>();
        int cursor = 0;
        for (int dayIndex = 0; dayIndex < days; dayIndex++) {
            int size = Math.min(MAX_EXERCISES_PER_DAY, base + (dayIndex < remainder ? 1 : 0));
            List<AiContext.CatalogExercise> dayExercises = pool.subList(cursor, cursor + size);
            cursor += size;

            List<WorkoutProposalPayload.PlannedExercise> planned = dayExercises.stream()
                    .map(exercise -> new WorkoutProposalPayload.PlannedExercise(
                            exercise.id(),
                            prescription.sets(),
                            new WorkoutProposalPayload.RepRange(prescription.repsMin(), prescription.repsMax()),
                            prescription.restSeconds()))
                    .toList();
            proposedDays.add(new WorkoutProposalPayload.Day(
                    dayName(split, dayIndex, dayExercises), planned));
        }

        return new WorkoutProposalPayload(
                programName(goal, split, splitChosenByUser),
                goal,
                proposedDays,
                "Proposta do provedor simulado, montada a partir do seu objetivo e do catálogo disponível. "
                        + "Revise os exercícios, as séries e as cargas antes de salvar.",
                split);
    }

    @Override
    public String coach(AiContext context, String historySummary, String message) {
        StringBuilder reply = new StringBuilder();
        reply.append("Com base no seu contexto atual (objetivo ")
                .append(goalLabel(context.goal()))
                .append(", ")
                .append(context.trainingDays() > 0 ? context.trainingDays() : 3)
                .append(" dia(s) por semana)");
        if (historySummary != null && !historySummary.isBlank()) {
            reply.append(" e no seu histórico recente (").append(historySummary).append(')');
        }
        reply.append(", a recomendação é progredir devagar: aumente a carga apenas quando completar o topo "
                + "da faixa de repetições com técnica estável e esforço percebido de até 8. "
                + "Mantenha o volume alinhado ao seu sono, à alimentação e à recuperação, e interrompa "
                + "qualquer movimento que gere dor.");
        return reply.toString();
    }

    @Override
    public VoiceInterpretationPayload interpretVoice(String transcript) {
        if (transcript == null || transcript.isBlank()) {
            throw new LlmSchemaException("The transcription is empty.");
        }

        List<VoiceInterpretationPayload.Set> sets = new ArrayList<>();
        for (String segment : SEGMENT_SEPARATOR.split(transcript)) {
            VoiceInterpretationPayload.Set set = readSet(sets.size() + 1, segment);
            if (set != null) {
                sets.add(set);
            }
        }

        if (sets.isEmpty()) {
            throw new LlmSchemaException("The transcription does not contain a recognizable set.");
        }

        return new VoiceInterpretationPayload(
                sets,
                "Interpretação do provedor simulado. Confirme a carga e as repetições antes de registrar.");
    }

    private static VoiceInterpretationPayload.Set readSet(int setNumber, String segment) {
        if (segment == null || segment.isBlank()) {
            return null;
        }
        BigDecimal weight = readDecimal(WEIGHT, segment);
        Integer repetitions = readInteger(REPETITIONS, segment);
        Integer duration = readInteger(DURATION, segment);
        Integer distance = readInteger(DISTANCE, segment);
        if (repetitions == null && duration == null && distance == null) {
            return null;
        }
        return new VoiceInterpretationPayload.Set(setNumber, weight, repetitions, duration, distance);
    }

    private static BigDecimal readDecimal(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }
        try {
            return new BigDecimal(matcher.group(1).replace(',', '.'));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static Integer readInteger(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return null;
        }
        try {
            return Integer.valueOf(matcher.group(1).replace(',', '.'));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    /**
     * Resolves the division of the proposal.
     *
     * <p>An explicit choice of the user is always respected. When the user leaves the choice to the
     * model, the division is derived deterministically from the number of training days, never
     * randomly: fewer days fit a full body program, four days fit an upper/lower split and five or
     * more days fit a push/pull/legs based split.
     */
    private static SplitType resolveSplit(AiContext context) {
        if (context.splitType() != null) {
            return context.splitType();
        }
        int trainingDays = context.trainingDays();
        if (trainingDays <= 3) {
            return SplitType.FULL_BODY;
        }
        if (trainingDays == 4) {
            return SplitType.UPPER_LOWER;
        }
        if (trainingDays == 5) {
            return SplitType.HYBRID_PPL_UPPER_LOWER;
        }
        return SplitType.PPL;
    }

    private static String dayName(SplitType split, int dayIndex, List<AiContext.CatalogExercise> exercises) {
        String[] plan = dayPlan(split);
        if (plan.length > 0) {
            return plan[dayIndex % plan.length];
        }
        Set<String> groups = new LinkedHashSet<>();
        for (AiContext.CatalogExercise exercise : exercises) {
            if (exercise.primaryMuscleGroup() != null && !exercise.primaryMuscleGroup().isBlank()) {
                groups.add(exercise.primaryMuscleGroup().strip());
            }
        }
        if (groups.isEmpty()) {
            return "Dia " + (dayIndex + 1);
        }
        String joined = String.join(" e ", groups.stream().limit(MAX_DISTINCT_GROUPS_IN_DAY_NAME).toList());
        return Character.toUpperCase(joined.charAt(0)) + joined.substring(1);
    }

    /**
     * Day focus of each division, in the order the days cycle. An empty plan means the day name is
     * derived from the muscle groups of the exercises, as happens with a custom program.
     */
    private static String[] dayPlan(SplitType split) {
        return switch (split) {
            case PPL -> new String[] {
                    "Push (peito, ombros e tríceps)",
                    "Pull (costas e bíceps)",
                    "Legs (pernas e glúteos)"};
            case UPPER_LOWER -> new String[] {"Superior", "Inferior"};
            case FULL_BODY -> new String[] {"Corpo inteiro"};
            case AB -> new String[] {"Superior", "Inferior"};
            case ABCD -> new String[] {
                    "Peito e tríceps",
                    "Costas e bíceps",
                    "Pernas e glúteos",
                    "Ombros e braços"};
            case ABCDE -> new String[] {"Peito", "Costas", "Pernas", "Ombros", "Braços"};
            case ABC -> new String[] {
                    "Peito e tríceps",
                    "Costas e bíceps",
                    "Pernas e ombros"};
            case ARNOLD_SPLIT -> new String[] {
                    "Peito e costas",
                    "Ombros e braços",
                    "Pernas"};
            case PHUL -> new String[] {
                    "Superior (força)",
                    "Inferior (força)",
                    "Superior (hipertrofia)",
                    "Inferior (hipertrofia)"};
            case HYBRID_PPL_UPPER_LOWER -> new String[] {
                    "Push",
                    "Pull",
                    "Pernas",
                    "Superior",
                    "Inferior"};
            case CUSTOM -> new String[0];
        };
    }

    private static String programName(TrainingGoal goal, SplitType split, boolean splitChosenByUser) {
        String base = switch (goal) {
            case HYPERTROPHY -> "Treino de hipertrofia";
            case STRENGTH -> "Treino de força";
            case ENDURANCE -> "Treino de resistência";
            case GENERAL -> "Treino geral";
        };
        if (!splitChosenByUser || split == null || split == SplitType.CUSTOM) {
            return base;
        }
        return base + " - " + splitLabel(split);
    }

    private static String splitLabel(SplitType split) {
        return switch (split) {
            case PPL -> "Push / Pull / Legs";
            case UPPER_LOWER -> "Upper / Lower";
            case FULL_BODY -> "Full Body";
            case AB -> "AB (Superior / Inferior)";
            case ABCD -> "ABCD";
            case ABCDE -> "ABCDE";
            case ABC -> "ABC";
            case ARNOLD_SPLIT -> "Arnold Split";
            case PHUL -> "PHUL";
            case HYBRID_PPL_UPPER_LOWER -> "Híbrido PPL + Upper/Lower";
            case CUSTOM -> "Personalizado";
        };
    }

    private static String goalLabel(TrainingGoal goal) {
        if (goal == null) {
            return "geral";
        }
        return switch (goal) {
            case HYPERTROPHY -> "hipertrofia";
            case STRENGTH -> "força";
            case ENDURANCE -> "resistência";
            case GENERAL -> "geral";
        };
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    /**
     * Prescription derived from the goal of the user.
     */
    private record Prescription(int sets, int repsMin, int repsMax, int restSeconds) {

        private static Prescription forGoal(TrainingGoal goal) {
            return switch (goal) {
                case STRENGTH -> new Prescription(4, 4, 6, 180);
                case HYPERTROPHY -> new Prescription(3, 8, 12, 90);
                case ENDURANCE -> new Prescription(3, 12, 20, 60);
                case GENERAL -> new Prescription(3, 8, 12, 90);
            };
        }
    }
}
