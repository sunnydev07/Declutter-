import type { CoachPersona, LockMode } from '../types/session';

export type CoachStage = 1 | 2 | 3;

export interface CoachSessionContext {
  sessionId: string;
  remainingSeconds: number;
  plannedDurationMinutes: number;
  lockMode: LockMode;
  category?: string;
  plantType?: string;
}

export interface CoachIntervention {
  stage: CoachStage;
  persona: CoachPersona;
  coachName: string;
  personaEmoji: string;
  gifPath: string;
  headline: string;
  message: string;
  quote: string;
  intensity: string;
  source: 'local' | 'gemini';
}

type CoachFacts = {
  remainingText: string;
  progressPercent: number;
  category: string;
  lockMode: string;
  plantType: string;
};

type CopyTemplate = (facts: CoachFacts) => {
  headline: string;
  message: string;
  quote: string;
  intensity: string;
};

const PERSONAS: Record<CoachPersona, { coachName: string; emoji: string; assetPrefix: string }> = {
  male: {
    coachName: 'Ares',
    emoji: '\u2694\uFE0F',
    assetPrefix: 'ares',
  },
  female: {
    coachName: 'Athena',
    emoji: '\u{1F6E1}\uFE0F',
    assetPrefix: 'athena',
  },
};

const LOCK_MODE_LABELS: Record<LockMode, string> = {
  soft: 'soft lock',
  app: 'app lock',
  view: 'view lock',
  full: 'full lock',
};

const COACH_BANK: Record<CoachPersona, Record<CoachStage, CopyTemplate[]>> = {
  male: {
    1: [
      (facts) => ({
        headline: 'Do not hand your attention back.',
        message: `You still have ${facts.remainingText} on the clock. ${facts.category} will not get finished by negotiating with discomfort. Shut the exit door and complete the next clean rep.`,
        quote: 'The urge to quit is a weather report, not an order.',
        intensity: 'First warning',
      }),
      (facts) => ({
        headline: 'This is the exact moment that counts.',
        message: `You are ${facts.progressPercent}% through a ${facts.lockMode}. Quitting now trains your brain to run at the first spike of boredom. Stay in position and take back one focused minute.`,
        quote: 'Discipline is built when leaving is available and you refuse it.',
        intensity: 'First warning',
      }),
      (facts) => ({
        headline: 'No debate. Back to the work.',
        message: `${facts.plantType} was planted for a reason. You have ${facts.remainingText} left, and the next action is smaller than this argument. Return and finish the block in front of you.`,
        quote: 'A promise kept under pressure becomes identity.',
        intensity: 'First warning',
      }),
    ],
    2: [
      (facts) => ({
        headline: 'You came back to the exit.',
        message: `That means the work is touching the weak spot. ${facts.category} needs pressure, not comfort. You have ${facts.remainingText}; stop bargaining and hold the line.`,
        quote: 'Comfort gets louder right before focus gets stronger.',
        intensity: 'Escalation',
      }),
      (facts) => ({
        headline: 'Your focus is under inspection.',
        message: `Second quit attempt during ${facts.lockMode}. The task did not change, only your tolerance did. Stand still, breathe once, and return to the screen with intent.`,
        quote: 'The second impulse is where the habit is rewritten.',
        intensity: 'Escalation',
      }),
      (facts) => ({
        headline: 'This is not an emergency yet.',
        message: `${facts.remainingText} remains. If this is just resistance, do not reward it. Protect the session, protect ${facts.plantType}, and make the next five minutes boringly complete.`,
        quote: 'Pressure is not a stop sign; it is the entry fee.',
        intensity: 'Escalation',
      }),
    ],
    3: [
      (facts) => ({
        headline: 'Last gate before the penalty.',
        message: `If this is truly necessary, take the emergency code deliberately. If it is craving, fatigue, or avoidance, leave it here and return to ${facts.category}.`,
        quote: 'A real exit can survive one more honest breath.',
        intensity: 'Final gate',
      }),
      (facts) => ({
        headline: 'No more soft exits.',
        message: `Third quit attempt with ${facts.remainingText} left. The code is available next, but it will end the session as failed. Choose with a clear head, not a restless hand.`,
        quote: 'Freedom includes the cost of the choice.',
        intensity: 'Final gate',
      }),
      (facts) => ({
        headline: 'Decide like it matters.',
        message: `${facts.plantType} survives only if you go back. If you unlock now, own the failed session without drama. If you stay, make the next minute undeniable.`,
        quote: 'The final gate is not locked; it asks who is in command.',
        intensity: 'Final gate',
      }),
    ],
  },
  female: {
    1: [
      (facts) => ({
        headline: 'Hold your standard.',
        message: `${facts.category} still has ${facts.remainingText} reserved. The discomfort is temporary; the pattern you choose now is not. Return to the work and make the next minute clean.`,
        quote: 'Attention is a vow renewed one minute at a time.',
        intensity: 'First warning',
      }),
      (facts) => ({
        headline: 'Do not confuse friction with failure.',
        message: `You are ${facts.progressPercent}% through this ${facts.lockMode}. The session is asking for steadiness, not perfection. Set your eyes back on the task and continue.`,
        quote: 'A disciplined mind does not need the mood to agree.',
        intensity: 'First warning',
      }),
      (facts) => ({
        headline: 'The exit can wait.',
        message: `${facts.plantType} is still alive. You have ${facts.remainingText} left, and leaving now turns a passing urge into a decision. Stay with the promise you already made.`,
        quote: 'Resolve is quietest when it is strongest.',
        intensity: 'First warning',
      }),
    ],
    2: [
      (facts) => ({
        headline: 'Second approach. Stronger answer.',
        message: `You returned to the quit path, so answer with structure. One breath, one line, one problem, one page. ${facts.category} gets your attention again now.`,
        quote: 'When resistance repeats, so does the standard.',
        intensity: 'Escalation',
      }),
      (facts) => ({
        headline: 'Stop feeding the interruption.',
        message: `${facts.remainingText} remains under ${facts.lockMode}. The impulse is trying to become policy. Decline it and resume before it writes your habits for you.`,
        quote: 'A focused person closes loops, not just tabs.',
        intensity: 'Escalation',
      }),
      (facts) => ({
        headline: 'You are not done here.',
        message: `This is the second quit signal, not a command. Protect ${facts.plantType}, protect the session, and finish the smallest visible step before deciding anything else.`,
        quote: 'The mind gets sharper when the escape route stays unused.',
        intensity: 'Escalation',
      }),
    ],
    3: [
      (facts) => ({
        headline: 'Final gate. Be precise.',
        message: `The emergency code comes next if you insist. Use it only for a real need. If this is avoidance, return to ${facts.category} and let the session stand.`,
        quote: 'A deliberate choice should still look wise ten minutes later.',
        intensity: 'Final gate',
      }),
      (facts) => ({
        headline: 'Choose the cost or the comeback.',
        message: `You have ${facts.remainingText} left. Unlocking now fails the session; returning now proves this urge did not outrank your plan. Make the choice deliberately.`,
        quote: 'The strongest boundary is the one you keep when no one sees it.',
        intensity: 'Final gate',
      }),
      (facts) => ({
        headline: 'This is the last interruption.',
        message: `${facts.plantType} is one decision from wilting or surviving. If the emergency is real, proceed. If not, close this panel and finish the timer.`,
        quote: 'Clarity is calm enough to pay the full price.',
        intensity: 'Final gate',
      }),
    ],
  },
};

const blockedCopyPatterns = [
  /\bkill\b/i,
  /\bdie\b/i,
  /\bhurt\b/i,
  /\bharm\b/i,
  /\bstupid\b/i,
  /\bidiot\b/i,
  /\bpathetic\b/i,
  /\bloser\b/i,
  /\bworthless\b/i,
  /\bcoward\b/i,
  /\bweakling\b/i,
  /\bshame\b/i,
];

const formatRemainingTime = (seconds: number) => {
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainingSeconds = clamped % 60;

  if (minutes <= 0) return `${remainingSeconds}s`;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
};

const titleCase = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const stableHash = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const getFacts = (context: CoachSessionContext): CoachFacts => {
  const plannedSeconds = Math.max(1, context.plannedDurationMinutes * 60);
  const elapsedSeconds = Math.max(0, plannedSeconds - Math.max(0, context.remainingSeconds));
  const progressPercent = Math.min(99, Math.max(0, Math.round((elapsedSeconds / plannedSeconds) * 100)));

  return {
    remainingText: formatRemainingTime(context.remainingSeconds),
    progressPercent,
    category: context.category?.trim() || 'this session',
    lockMode: LOCK_MODE_LABELS[context.lockMode],
    plantType: context.plantType ? titleCase(context.plantType) : 'your plant',
  };
};

export const buildCoachIntervention = (
  stage: CoachStage,
  persona: CoachPersona,
  context: CoachSessionContext,
): CoachIntervention => {
  const personaMeta = PERSONAS[persona];
  const templates = COACH_BANK[persona][stage];
  const seed = [
    context.sessionId,
    stage,
    persona,
    context.remainingSeconds,
    context.plannedDurationMinutes,
    context.lockMode,
    context.category ?? '',
    context.plantType ?? '',
  ].join('|');
  const template = templates[stableHash(seed) % templates.length];
  const copy = template(getFacts(context));

  return {
    stage,
    persona,
    coachName: personaMeta.coachName,
    personaEmoji: personaMeta.emoji,
    gifPath: `/coach/${personaMeta.assetPrefix}-${stage}.gif`,
    headline: copy.headline,
    message: copy.message,
    quote: copy.quote,
    intensity: copy.intensity,
    source: 'local',
  };
};

const normalizeGeneratedText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!normalized || normalized.length > maxLength) return null;
  if (blockedCopyPatterns.some((pattern) => pattern.test(normalized))) return null;

  return normalized;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractGeminiText = (payload: unknown) => {
  if (!isRecord(payload) || !Array.isArray(payload.candidates)) return '';

  const [candidate] = payload.candidates;
  if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
    return '';
  }

  return candidate.content.parts
    .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
    .join(' ')
    .trim();
};

const parseGeminiCopy = (rawText: string) => {
  const stripped = rawText.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!isRecord(parsed)) return null;

    const message = normalizeGeneratedText(parsed.message, 360);
    const quote = normalizeGeneratedText(parsed.quote, 160);

    if (!message || !quote) return null;
    return { message, quote };
  } catch {
    return null;
  }
};

const buildGeminiPrompt = (localCopy: CoachIntervention, context: CoachSessionContext) => {
  const facts = getFacts(context);

  return [
    `Write replacement copy for Declutter's ${localCopy.coachName} quit-resistance coach.`,
    'Return strict JSON only: {"message":"...","quote":"..."}',
    'Tone: drill-sergeant direct, intense, concise, and motivational.',
    'Boundaries: no slurs, threats, self-harm language, humiliation, profanity, identity attacks, or medical advice.',
    'Logic rule: do not mention unlocking instructions, codes, bypasses, or app behavior.',
    `Stage: ${localCopy.stage} of 3 (${localCopy.intensity}).`,
    `Context: ${facts.remainingText} remaining, ${facts.progressPercent}% complete, category ${facts.category}, ${facts.lockMode}, plant ${facts.plantType}.`,
    `Keep message under 300 characters and quote under 120 characters. Local example: ${localCopy.message} Quote: ${localCopy.quote}`,
  ].join('\n');
};

export const requestGeminiCoachCopy = async (
  localCopy: CoachIntervention,
  context: CoachSessionContext,
  apiKey: string,
  timeoutMs = 2500,
) => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': trimmedKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildGeminiPrompt(localCopy, context) }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 140,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    const text = extractGeminiText(payload);
    if (!text) return null;

    return parseGeminiCopy(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
