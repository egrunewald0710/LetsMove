import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing } from '@/theme/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Sport = 'swim' | 'bike' | 'run' | 'gym' | 'brick' | 'rest';

type GeneratedStep = {
  label: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  target_intensity: string | null;
  repeat_count: number;
};

type GeneratedWorkout = {
  date: string;
  sport: Sport;
  title: string;
  notes: string | null;
  planned_duration_seconds: number | null;
  steps: GeneratedStep[];
};

type GeneratedPlan = {
  workouts: GeneratedWorkout[];
};

type IntakeForm = {
  goal: string;
  weeks: string;
  daysPerWeek: string;
  experience: string;
  availability: string;
  equipment: string;
  injuries: string;
  notes: string;
};

const DEFAULT_FORM: IntakeForm = {
  goal: 'Prepare for a sprint triathlon in 8 weeks',
  weeks: '8',
  daysPerWeek: '4',
  experience: 'Intermediate',
  availability: '3 weeknights and 1 weekend block',
  equipment: 'Pool access, bike trainer, and running shoes',
  injuries: 'No injuries',
  notes: 'Build aerobic endurance, keep one strength day, and hold recovery days steady.',
};

async function callOpenRouterForPlan(form: IntakeForm): Promise<GeneratedPlan> {
  const { data, error } = await supabase.functions.invoke<GeneratedPlan>(
    'generate-training-plan',
    { body: form }
  );

  if (error) {
    const context = error.context;
    if (context instanceof Response) {
      const details = await context.clone().json().catch(() => null);
      if (typeof details?.error === 'string') throw new Error(details.error);
      if (context.status === 404 || details?.code === 'NOT_FOUND') {
        throw new Error(
          'The planner function is not deployed. From the project root, run: npx supabase functions deploy generate-training-plan'
        );
      }
      if (typeof details?.message === 'string') throw new Error(details.message);
      throw new Error(`Planner request failed (HTTP ${context.status}).`);
    }
    throw new Error(error.message);
  }

  if (!data || !Array.isArray(data.workouts)) {
    throw new Error('The planner returned an invalid plan. Please try again.');
  }

  return data;
}

export default function AICoachPlannerScreen() {
  const [form, setForm] = useState<IntakeForm>(DEFAULT_FORM);
  const [plan, setPlan] = useState<GeneratedPlan>({ workouts: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const { session } = useAuth();

  const summary = useMemo(() => {
    const totalDays = plan.workouts.length;
    const trainingDays = plan.workouts.filter((workout) => workout.sport !== 'rest').length;
    const sports = [...new Set(plan.workouts.map((workout) => workout.sport))];
    return { totalDays, trainingDays, sports };
  }, [plan]);

  const steps = [
    {
      title: 'Your goal',
      fields: ['goal', 'weeks', 'daysPerWeek', 'experience'] as const,
    },
    {
      title: 'Training setup',
      fields: ['availability', 'equipment'] as const,
    },
    {
      title: 'Health & notes',
      fields: ['injuries', 'notes'] as const,
    },
  ];

  const updateField = (field: keyof IntakeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const isNextDisabled = currentStep === 0 && !form.goal.trim();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((value) => value + 1);
      setError(null);
      return;
    }

    void generatePlan();
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((value) => value - 1);
      setError(null);
    }
  };

  const generatePlan = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const nextPlan = await callOpenRouterForPlan(form);
      setPlan(nextPlan);
      setPlanSaved(false);
      setCurrentStep(steps.length - 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while generating the plan.'
      );
      setPlan({ workouts: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const savePlan = async () => {
    if (!session?.user.id || !plan.workouts.length || isSavingPlan || planSaved) return;

    setIsSavingPlan(true);
    setError(null);
    try {
      for (const workout of plan.workouts) {
        const plannedDistance = workout.steps.reduce(
          (sum, step) => sum + (step.distance_meters ?? 0) * step.repeat_count,
          0
        );
        const { data, error: workoutError } = await (supabase.from('workouts') as any)
          .insert({
            user_id: session.user.id,
            sport: workout.sport,
            title: workout.title,
            scheduled_date: workout.date,
            planned_duration_seconds: workout.planned_duration_seconds,
            planned_distance_meters: plannedDistance || null,
            notes: workout.notes,
            status: 'planned',
          })
          .select('id')
          .single();
        if (workoutError) throw workoutError;

        if (workout.steps.length > 0) {
          const { error: stepsError } = await (supabase.from('workout_steps') as any).insert(
            workout.steps.map((step, orderIndex) => ({
              workout_id: data.id,
              order_index: orderIndex,
              label: step.label,
              duration_seconds: step.duration_seconds,
              distance_meters: step.distance_meters,
              target_intensity: step.target_intensity,
              repeat_count: step.repeat_count,
            }))
          );
          if (stepsError) throw stepsError;
        }
      }
      setPlanSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the training plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerWrap}>
        <Text style={styles.eyebrow}>AI COACH</Text>
        <Text style={styles.title}>Set up your training plan</Text>
        <Text style={styles.subtitle}>
          Complete the steps below and we’ll build a personalized plan for your goal.
        </Text>
      </View>

      <View style={styles.progressWrap}>
        {steps.map((step, index) => (
          <View
            key={step.title}
            style={[styles.progressDot, index === currentStep ? styles.progressDotActive : null]}
          />
        ))}
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.sectionTitle}>Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}</Text>

        {currentStep === 0 ? (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Race / goal</Text>
              <TextInput
                style={styles.input}
                value={form.goal}
                onChangeText={(value) => updateField('goal', value)}
                placeholder="Example: Prepare for a sprint triathlon in 8 weeks"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Training weeks</Text>
              <TextInput
                style={styles.input}
                value={form.weeks}
                onChangeText={(value) => updateField('weeks', value)}
                keyboardType="number-pad"
                placeholder="8"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Days per week</Text>
              <TextInput
                style={styles.input}
                value={form.daysPerWeek}
                onChangeText={(value) => updateField('daysPerWeek', value)}
                keyboardType="number-pad"
                placeholder="4"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Experience level</Text>
              <TextInput
                style={styles.input}
                value={form.experience}
                onChangeText={(value) => updateField('experience', value)}
                placeholder="Beginner, intermediate, advanced"
              />
            </View>
          </>
        ) : null}

        {currentStep === 1 ? (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Availability</Text>
              <TextInput
                style={styles.input}
                value={form.availability}
                onChangeText={(value) => updateField('availability', value)}
                placeholder="3 weeknights and 1 weekend block"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Equipment access</Text>
              <TextInput
                style={styles.input}
                value={form.equipment}
                onChangeText={(value) => updateField('equipment', value)}
                placeholder="Pool access, bike trainer, treadmill"
              />
            </View>
          </>
        ) : null}

        {currentStep === 2 ? (
          <>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Injuries / limitations</Text>
              <TextInput
                style={styles.input}
                value={form.injuries}
                onChangeText={(value) => updateField('injuries', value)}
                placeholder="No injuries"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Additional notes</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.notes}
                onChangeText={(value) => updateField('notes', value)}
                multiline
                textAlignVertical="top"
                placeholder="Goal focus, race date, preferred intensity, recovery needs..."
              />
            </View>
          </>
        ) : null}

        <View style={styles.buttonRow}>
          {currentStep > 0 ? (
            <TouchableOpacity style={[styles.secondaryButton]} onPress={previousStep}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, (isLoading || isNextDisabled) && styles.primaryButtonDisabled]}
            onPress={nextStep}
            disabled={isLoading || isNextDisabled}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Generating…' : currentStep === steps.length - 1 ? 'Generate plan' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {plan.workouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No plan generated yet. Fill in the form and tap generate.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Plan summary</Text>
            <Text style={styles.summaryText}>
              {summary.trainingDays} training days across {summary.totalDays} scheduled days
            </Text>
            <Text style={styles.summaryText}>Included sports: {summary.sports.join(', ')}</Text>
          </View>

          <View style={styles.planWrap}>
            {plan.workouts.map((workout, index) => (
              <View key={`${workout.date}-${index}`} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutDate}>{workout.date}</Text>
                  <Text style={[styles.sportBadge, { backgroundColor: `${colors[workout.sport]}15`, color: colors[workout.sport] }]}>
                    {workout.sport.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.workoutTitle}>{workout.title}</Text>
                {workout.notes ? <Text style={styles.workoutNotes}>{workout.notes}</Text> : null}
                {workout.planned_duration_seconds ? (
                  <Text style={styles.durationText}>
                    {Math.round(workout.planned_duration_seconds / 60)} min
                  </Text>
                ) : null}

                {workout.steps.length > 0 ? (
                  <View style={styles.stepsWrap}>
                    {workout.steps.map((step, stepIndex) => (
                      <View key={`${workout.date}-${step.label}-${stepIndex}`} style={styles.stepRow}>
                        <Text style={styles.stepLabel}>{step.label}</Text>
                        <Text style={styles.stepMeta}>
                          {step.duration_seconds ? `${Math.round(step.duration_seconds / 60)} min` : ''}
                          {step.distance_meters ? ` • ${Math.round(step.distance_meters)} m` : ''}
                          {step.target_intensity ? ` • ${step.target_intensity}` : ''}
                          {step.repeat_count > 1 ? ` • x${step.repeat_count}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.savePlanButton, (isSavingPlan || planSaved) && styles.savePlanButtonDisabled]}
            onPress={() => void savePlan()}
            disabled={isSavingPlan || planSaved}
          >
            {isSavingPlan ? <ActivityIndicator color="#fff" /> : null}
            <Text style={styles.savePlanButtonText}>
              {isSavingPlan ? 'Saving plan…' : planSaved ? 'Plan added to calendar' : 'Add plan to calendar'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerWrap: { marginTop: spacing.md },
  eyebrow: { color: colors.blue, fontSize: 11, letterSpacing: 1.5, fontWeight: '900' },
  title: { marginTop: 8, fontSize: 28, fontWeight: '900', color: colors.text },
  subtitle: { marginTop: 8, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  inputCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  progressWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#DDE7F3',
  },
  progressDotActive: {
    backgroundColor: colors.blue,
  },
  sectionBlock: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.5,
    fontWeight: '900',
    color: colors.blue,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  fieldRow: {
    marginBottom: spacing.md,
  },
  label: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
  },
  textarea: {
    minHeight: 110,
    paddingTop: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  secondaryButton: {
    flex: 0.45,
    backgroundColor: '#EAF1FB',
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.blue,
    fontWeight: '900',
    fontSize: 15,
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  summaryTitle: { fontWeight: '900', color: colors.text, fontSize: 16 },
  summaryText: { marginTop: 6, color: colors.textMuted, fontSize: 13 },
  planWrap: { marginTop: spacing.md },
  savePlanButton: {
    minHeight: 48,
    marginTop: spacing.sm,
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  savePlanButtonDisabled: { opacity: 0.7 },
  savePlanButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutDate: { fontWeight: '800', color: colors.textMuted },
  sportBadge: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  workoutTitle: { marginTop: 10, fontSize: 18, fontWeight: '900', color: colors.text },
  workoutNotes: { marginTop: 6, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  durationText: { marginTop: 8, color: colors.blue, fontWeight: '800', fontSize: 13 },
  stepsWrap: { marginTop: 12, gap: 8 },
  stepRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  stepLabel: { fontWeight: '800', color: colors.text, fontSize: 13 },
  stepMeta: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
});
