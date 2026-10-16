// Development-only deterministic balance sampler. It imports the production
// event/deck/scoring engine, but never mutates production constants or runtime state.
import { createScenarioAdventureMatch } from './scenario-adventure/scenario-engine.js';
import { createDeckState, prepareDeckForTurn } from './scenario-adventure/deck-engine.js';
import {
  EVENT_TYPES,
  EVENT_CATALOG,
  eventTypeForTile,
  openBoardEvent,
  resolveBoardEvent,
  chooseEventIntent,
} from './scenario-adventure/board-events.js';
import {
  RESPONSE_TYPES,
  evaluateCardCompatibility,
  chooseBotResponse,
  determineDemoWinner,
  determineDemoWinners,
} from './scenario-adventure/response-engine.js';
import { buildTilePath } from './map-3d/board-data.js';

const MATCHES_PER_POLICY = Number(process.env.BALANCE_MATCHES || 1000);
const POLICIES = ['SAFE', 'REWARD', 'RANDOM'];
const STARTER_LOADOUT = Object.freeze([
  'patch-update',
  'firewall-guard',
  'energy-boost',
  'patch-update',
  'firewall-guard',
]);
const STARTER_ALLOWED = Object.freeze(['patch-update', 'firewall-guard', 'energy-boost']);

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseCardIntent({ scenario, deck, random, policy }) {
  const cards = deck.hand
    .filter((instance) => STARTER_ALLOWED.includes(instance.cardId))
    .map((instance) => ({
      instance,
      evaluation: evaluateCardCompatibility(scenario, instance.cardId),
    }))
    .filter(({ evaluation }) => evaluation.usable);

  if (policy === 'RANDOM') {
    const options = [null, ...cards];
    const picked = options[Math.floor(random() * options.length)];
    return picked
      ? { responseType: RESPONSE_TYPES.CARD, instanceId: picked.instance.instanceId }
      : { responseType: RESPONSE_TYPES.BASIC };
  }

  // Both rational policies spend a card only when it beats Basic (+1/-1).
  const effective = cards.find(({ evaluation }) => evaluation.compatibility === 'EFFECTIVE');
  return effective
    ? { responseType: RESPONSE_TYPES.CARD, instanceId: effective.instance.instanceId }
    : { responseType: RESPONSE_TYPES.BASIC };
}

function chooseLegacyBotIntent({ event, scenario, deck }) {
  if (event.type === 'ACTION' || event.type === 'RISK') {
    const eligible = { ...deck, hand: deck.hand.filter((card) => STARTER_ALLOWED.includes(card.cardId)) };
    const selected = chooseBotResponse({ scenario, deck: eligible });
    if (event.type === 'ACTION' || selected.type === RESPONSE_TYPES.CARD) {
      return { responseType: selected.type, instanceId: selected.instanceId };
    }
  }
  const choices = (EVENT_CATALOG[event.type] || []).find((item) => item.id === event.contentId)?.choices || [];
  return { choiceId: (event.type === 'SUPPORT' ? choices[0] : choices.at(-1)).id };
}

function chooseIntent({ event, scenario, deck, random, policy, stability, variant, match, actorId }) {
  if (policy === 'BOT_CURRENT') {
    return chooseLegacyBotIntent({ event, scenario, deck });
  }
  if (policy === 'BOT_REFINED') {
    return chooseEventIntent({ event, scenario, deck, allowedIds: STARTER_ALLOWED, match, actorId });
  }
  if (event.type === 'ACTION') return chooseCardIntent({ scenario, deck, random, policy });
  if (event.type === 'RISK') {
    if (policy === 'RANDOM') {
      const useCard = random() < 0.5;
      if (useCard) {
        const cardIntent = chooseCardIntent({ scenario, deck, random, policy: 'RANDOM' });
        if (cardIntent.responseType === RESPONSE_TYPES.CARD) return cardIntent;
      }
    } else {
      const effective = deck.hand.find((instance) =>
        STARTER_ALLOWED.includes(instance.cardId)
        && evaluateCardCompatibility(scenario, instance.cardId).compatibility === 'EFFECTIVE');
      if (effective) return { responseType: RESPONSE_TYPES.CARD, instanceId: effective.instanceId };
    }
    return { choiceId: 'accept' };
  }
  if (event.type === 'SUPPORT') {
    if (policy === 'RANDOM') return { choiceId: random() < 0.5 ? 'report' : 'restore' };
    if (policy === 'SAFE') return { choiceId: stability < 10 ? 'restore' : 'report' };
    return { choiceId: 'report' };
  }
  if (event.type === 'DECISION') {
    if (policy === 'RANDOM') return { choiceId: random() < 0.5 ? 'pilot' : 'review' };
    return { choiceId: policy === 'SAFE' ? 'review' : 'pilot' };
  }
  if (event.type === 'MOVEMENT') {
    if (policy === 'RANDOM') return { choiceId: random() < 0.5 ? 'forward' : 'review' };
    if (variant === 'MOVEMENT_CANDIDATE') {
      return { choiceId: policy === 'SAFE' ? 'review' : 'forward' };
    }
    // Current forward gives no score or safety. Backward gives +1 RP at no cost.
    return { choiceId: 'review' };
  }
  throw new Error(`Unsupported event ${event.type}`);
}

function applyMovementCandidate(resolved, actorId, choiceId) {
  if (resolved.result?.eventType !== 'MOVEMENT') return resolved;
  const proposed = choiceId === 'forward'
    ? { rpDelta: 1, stabilityDelta: -1 }
    : { rpDelta: 0, stabilityDelta: 1 };
  const current = resolved.result;
  const priorStability = resolved.match.scores[actorId].stability - current.appliedStabilityDelta;
  const priorRp = resolved.match.scores[actorId].rp - current.rpDelta;
  const nextScore = {
    rp: Math.max(0, priorRp + proposed.rpDelta),
    stability: Math.max(0, Math.min(10, priorStability + proposed.stabilityDelta)),
  };
  const nextResult = {
    ...current,
    rpDelta: proposed.rpDelta,
    stabilityDelta: proposed.stabilityDelta,
    appliedStabilityDelta: nextScore.stability - priorStability,
    simulationVariant: 'MOVEMENT_CANDIDATE',
  };
  const scores = { ...resolved.match.scores, [actorId]: nextScore };
  const responseHistory = [...resolved.match.responseHistory];
  responseHistory[responseHistory.length - 1] = nextResult;
  const finished = resolved.match.status === 'FINISHED';
  const match = {
    ...resolved.match,
    scores,
    responseHistory,
    winners: finished ? determineDemoWinners(scores) : resolved.match.winners,
    winner: finished ? determineDemoWinner(scores) : resolved.match.winner,
  };
  return { ...resolved, match, result: nextResult };
}

function correlation(samples, left, right) {
  const n = samples.length;
  const meanA = samples.reduce((sum, item) => sum + item[left], 0) / n;
  const meanB = samples.reduce((sum, item) => sum + item[right], 0) / n;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (const item of samples) {
    const a = item[left] - meanA;
    const b = item[right] - meanB;
    covariance += a * b;
    varianceA += a * a;
    varianceB += b * b;
  }
  return varianceA && varianceB ? covariance / Math.sqrt(varianceA * varianceB) : 0;
}

function summarize(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    mean: Number(mean.toFixed(3)),
    sd: Number(Math.sqrt(variance).toFixed(3)),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

async function runMatch({ actorCount, policy, policyPlan = null, seed, variant = 'CURRENT' }) {
  const actorOrder = ['player', 'bot', 'player3', 'player4'].slice(0, actorCount);
  const environmentRandom = seeded(seed * 2 + 11);
  const policyRandom = seeded(seed * 2 + 29);
  let match = createScenarioAdventureMatch({ actorOrder });
  const positions = Object.fromEntries(actorOrder.map((actor) => [actor, 0]));
  const diceTotals = Object.fromEntries(actorOrder.map((actor) => [actor, 0]));
  const decks = Object.fromEntries(actorOrder.map((actor, index) => [
    actor,
    createDeckState(STARTER_LOADOUT, {
      actorId: actor,
      matchId: `balance-${seed}-${index}`,
      random: environmentRandom,
    }),
  ]));

  while (match.status === 'PLAYING') {
    const actorId = match.currentTurn;
    const roll = 1 + Math.floor(environmentRandom() * 6);
    diceTotals[actorId] += roll;
    const path = buildTilePath(positions[actorId], roll);
    positions[actorId] = path.at(-1);
    const opened = await openBoardEvent({
      match,
      actorId,
      tileIndex: positions[actorId],
      random: environmentRandom,
      type: eventTypeForTile(positions[actorId]),
    });
    match = opened.match;
    const actorPolicy = policyPlan?.[actorOrder.indexOf(actorId)] || policy;
    const intent = chooseIntent({
      event: opened.event,
      scenario: opened.scenario,
      deck: decks[actorId],
      random: policyRandom,
      policy: actorPolicy,
      stability: match.scores[actorId].stability,
      variant,
      match,
      actorId,
    });
    let resolved = resolveBoardEvent({
      match,
      event: opened.event,
      scenario: opened.scenario,
      actorId,
      deck: decks[actorId],
      allowedIds: STARTER_ALLOWED,
      intent,
      position: positions[actorId],
    });
    if (variant === 'MOVEMENT_CANDIDATE') {
      resolved = applyMovementCandidate(resolved, actorId, intent.choiceId);
    }
    match = resolved.match;
    decks[actorId] = resolved.deck;
    positions[actorId] = resolved.position;
    if (match.status === 'PLAYING') {
      const index = actorOrder.indexOf(actorId);
      const next = actorOrder[(index + 1) % actorOrder.length];
      match = { ...match, currentTurn: next };
      decks[next] = prepareDeckForTurn(decks[next], environmentRandom);
    }
  }
  return { match, diceTotals };
}

async function sampleMixed({ actorCount, variant, matches }) {
  const actorOrder = ['player', 'bot', 'player3', 'player4'].slice(0, actorCount);
  const basePolicies = ['SAFE', 'REWARD', 'RANDOM', 'BOT_CURRENT'].slice(0, actorCount);
  const aggregate = Object.fromEntries(basePolicies.map((policy) => [policy, { wins: 0, rp: [], stability: [] }]));
  let tiebreaks = 0;
  let draws = 0;
  for (let index = 0; index < matches; index += 1) {
    const offset = index % actorCount;
    const policyPlan = actorOrder.map((_, seat) => basePolicies[(seat + offset) % actorCount]);
    const { match } = await runMatch({
      actorCount,
      policy: null,
      policyPlan,
      variant,
      seed: 9000000 + actorCount * 100000 + index,
    });
    const maxRp = Math.max(...Object.values(match.scores).map((score) => score.rp));
    const rpLeaders = match.actorOrder.filter((actor) => match.scores[actor].rp === maxRp);
    if (rpLeaders.length > 1 && new Set(rpLeaders.map((actor) => match.scores[actor].stability)).size > 1) tiebreaks += 1;
    if (match.winner === 'DRAW') draws += 1;
    for (const actor of actorOrder) {
      const seat = actorOrder.indexOf(actor);
      const actorPolicy = policyPlan[seat];
      aggregate[actorPolicy].rp.push(match.scores[actor].rp);
      aggregate[actorPolicy].stability.push(match.scores[actor].stability);
      if (match.winners.includes(actor)) aggregate[actorPolicy].wins += 1 / match.winners.length;
    }
  }
  return {
    actorCount,
    variant,
    matches,
    rotation: basePolicies,
    stabilityTiebreakRate: Number((tiebreaks / matches).toFixed(4)),
    drawRate: Number((draws / matches).toFixed(4)),
    policies: Object.fromEntries(Object.entries(aggregate).map(([policy, values]) => [policy, {
      winShare: Number((values.wins / matches).toFixed(4)),
      rp: summarize(values.rp),
      stability: summarize(values.stability),
    }])),
  };
}

async function sample({ actorCount, policy, variant, matches }) {
  const eventCounts = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0]));
  const choiceCounts = {};
  const rp = [];
  const stability = [];
  const actorSamples = [];
  const eventPerActorSamples = Object.fromEntries(EVENT_TYPES.map((type) => [type, []]));
  const winsBySeat = Array(actorCount).fill(0);
  let cardUses = 0;
  let partialCardUses = 0;
  let ineffectiveCardUses = 0;
  let basics = 0;
  let stabilityTiebreaks = 0;
  let draws = 0;
  let supportHealingWaste = 0;
  for (let index = 0; index < matches; index += 1) {
    const { match, diceTotals } = await runMatch({
      actorCount,
      policy,
      variant,
      seed: 1000000 * actorCount + 10000 * (POLICIES.indexOf(policy) + 2) + index,
    });
    const maxRp = Math.max(...Object.values(match.scores).map((score) => score.rp));
    const rpLeaders = match.actorOrder.filter((actor) => match.scores[actor].rp === maxRp);
    if (rpLeaders.length > 1 && new Set(rpLeaders.map((actor) => match.scores[actor].stability)).size > 1) {
      stabilityTiebreaks += 1;
    }
    if (match.winner === 'DRAW') draws += 1;
    for (const winner of match.winners) winsBySeat[match.actorOrder.indexOf(winner)] += 1 / match.winners.length;
    for (const event of match.eventHistory.filter((item) => item.resolved)) eventCounts[event.type] += 1;
    for (const result of match.responseHistory) {
      const key = `${result.eventType}:${result.choiceId || result.compatibility}`;
      choiceCounts[key] = (choiceCounts[key] || 0) + 1;
      if (result.responseType === 'CARD') {
        cardUses += 1;
        if (result.compatibility === 'PARTIAL') partialCardUses += 1;
        if (result.compatibility === 'INEFFECTIVE') ineffectiveCardUses += 1;
      }
      if (result.responseType === 'BASIC') basics += 1;
      if (result.eventType === 'SUPPORT' && result.choiceId === 'restore' && result.appliedStabilityDelta === 0) supportHealingWaste += 1;
    }
    for (const actor of match.actorOrder) {
      const score = match.scores[actor];
      const actorEventCounts = Object.fromEntries(EVENT_TYPES.map((type) => [
        type,
        match.eventHistory.filter((event) => event.actorId === actor && event.type === type).length,
      ]));
      for (const type of EVENT_TYPES) eventPerActorSamples[type].push(actorEventCounts[type]);
      rp.push(score.rp);
      stability.push(score.stability);
      actorSamples.push({
        dice: diceTotals[actor],
        rp: score.rp,
        action: actorEventCounts.ACTION,
      });
    }
  }
  const totalEvents = matches * actorCount * 6;
  return {
    actorCount,
    policy,
    variant,
    matches,
    totalEvents,
    eventShare: Object.fromEntries(EVENT_TYPES.map((type) => [type, Number((eventCounts[type] / totalEvents).toFixed(4))])),
    meanEventsPerActor: Object.fromEntries(EVENT_TYPES.map((type) => [type, Number((eventCounts[type] / (matches * actorCount)).toFixed(3))])),
    eventsPerActor: Object.fromEntries(EVENT_TYPES.map((type) => [type, summarize(eventPerActorSamples[type])])),
    rp: summarize(rp),
    stability: summarize(stability),
    cardUseRate: Number((cardUses / totalEvents).toFixed(4)),
    partialCardUseRate: Number((partialCardUses / totalEvents).toFixed(4)),
    ineffectiveCardUseRate: Number((ineffectiveCardUses / totalEvents).toFixed(4)),
    basicRate: Number((basics / totalEvents).toFixed(4)),
    stabilityTiebreakRate: Number((stabilityTiebreaks / matches).toFixed(4)),
    drawRate: Number((draws / matches).toFixed(4)),
    supportHealingWasteRate: Number((supportHealingWaste / Math.max(1, eventCounts.SUPPORT)).toFixed(4)),
    diceRpCorrelation: Number(correlation(actorSamples, 'dice', 'rp').toFixed(4)),
    actionRpCorrelation: Number(correlation(actorSamples, 'action', 'rp').toFixed(4)),
    winShareBySeat: winsBySeat.map((wins) => Number((wins / matches).toFixed(4))),
    choiceCounts,
  };
}

const runs = [];
const mixedRuns = [];
for (const actorCount of [2, 3, 4]) {
  for (const policy of POLICIES) {
    runs.push(await sample({ actorCount, policy, variant: 'CURRENT', matches: MATCHES_PER_POLICY }));
    runs.push(await sample({ actorCount, policy, variant: 'MOVEMENT_CANDIDATE', matches: MATCHES_PER_POLICY }));
  }
  runs.push(await sample({ actorCount, policy: 'BOT_CURRENT', variant: 'CURRENT', matches: MATCHES_PER_POLICY }));
  runs.push(await sample({ actorCount, policy: 'BOT_REFINED', variant: 'CURRENT', matches: MATCHES_PER_POLICY }));
  mixedRuns.push(await sampleMixed({ actorCount, variant: 'CURRENT', matches: MATCHES_PER_POLICY }));
  mixedRuns.push(await sampleMixed({ actorCount, variant: 'MOVEMENT_CANDIDATE', matches: MATCHES_PER_POLICY }));
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  developmentOnly: true,
  assumptions: {
    turnsPerActor: 6,
    startTile: 0,
    loadout: STARTER_LOADOUT,
    allowedCardIds: STARTER_ALLOWED,
    currentRulesImportedFromRuntime: true,
    movementCandidate: {
      forward: { steps: 2, rp: 1, stability: -1 },
      backward: { steps: -2, rp: 0, stability: 1 },
    },
  },
  runs,
  mixedRuns,
}, null, 2));
