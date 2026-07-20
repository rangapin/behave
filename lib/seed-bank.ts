import type { Question } from "./types";

/**
 * Bump when SEED_BANK changes. storage.ts re-seeds when the stored version falls
 * behind this one — without it, editing the seed leaves the browser silently
 * serving a stale bank, which reads as a phantom bug. specs.md §5.
 */
export const SEED_VERSION = 1;

/** Current Dust bank — verbatim from specs.md §5. */
export const SEED_BANK: Question[] = [
  {
    id: "upset-customer",
    q: "Tell me about a time you helped a frustrated or upset customer. How did you handle it?",
    hint: "PokerStars — BB story. Start from a template answer, then make it highly tailored. Keep a high standard in CX at all times.",
  },
  {
    id: "great-support",
    q: "What does great support look like to you?",
    hint: "Fast response, genuine conversation, issue solved effectively. Great CX = the customer feeling heard and understood, not just the fix.",
    nostar: true,
  },
  {
    id: "say-no",
    q: "Tell me about a time you had to say no to a customer. How did you handle it?",
    hint: "⚠ No story yet — pick one before the interview.",
    nostory: true,
  },
  {
    id: "critical-feedback",
    q: "Tell me about a time you got critical feedback. What did you do with it?",
    hint: "⚠ No story yet — pick one before the interview.",
    nostory: true,
  },
  {
    id: "complex-technical",
    q: "Describe a complex technical problem you troubleshot. Walk me through how you found the root cause.",
    hint: "Quable — API. Beats needed: which customer, what broke, what you checked first, actual root cause, outcome + prevention (education). Tell it as a story, not a framework.",
  },
  {
    id: "problem-process",
    q: "Describe your process for solving problems.",
    hint: "Owning the customer relationship at Quable. Identify → collect data → root cause → generate options → select → implement → review & document.",
    nostar: true,
  },
  {
    id: "explain-nontechnical",
    q: "Tell me about a time you had to explain something technical to someone who wasn't technical.",
    hint: "Quable — Patricia, RBAC, product unavailable for user. Analogy tailored to her world. Outcome: no more confusion, no more product issue for her team.",
  },
  {
    id: "work-with-eng",
    q: "Tell me about a time you worked with engineering or product to get something fixed.",
    hint: "Quable — recurrent data-sync bug the tech team dismissed. Tracked each case, reproduced, Loomed them. Outcome: issue mostly solved / far less frequent.",
  },
  {
    id: "automation",
    q: "Tell me about a time you built a tool, automation, or process that eliminated repetitive work.",
    hint: "Quable — FAQ. Analyzed previous errors, drafted very specific FAQ entries, automated Level 1.",
  },
  {
    id: "learn-fast",
    q: "Describe a time you had to learn a new technical domain or product quickly. How did you go about it?",
    hint: "Time off — learning Claude Code by using Claude Code. Built a project. A system that lets me learn anything.",
  },
  {
    id: "initiative",
    q: "Describe a time you went above and beyond or took the initiative.",
    hint: "Quable — response time. 24h RT was 'fine' but I identified the pain point, worked a solution with the manager. RT: ~24h → ~30min.",
  },
  {
    id: "priorities",
    q: "Tell me about a time you juggled competing priorities or high ticket volume. How did you decide what to do first?",
    hint: "Quable — huge bug hitting most active users. 100 tickets: tag, dedicated queue, communicate the critical error. Fixed same afternoon, clean next day.",
  },
  {
    id: "time-management",
    q: "Describe an occasion when you had to manage your time to complete a task.",
    hint: "Freediving — 1h30 in the water. Personal discipline angle.",
  },
  {
    id: "mistake",
    q: "Tell me about a mistake or failure. What did you learn from it?",
    hint: "Achilleus — marketed on known channels instead of real market research. Learned: identify the need before enjoying the build. Alt: picking several questions from same chat / dry training Nicaragua.",
  },
  {
    id: "conflict",
    q: "Tell me about a time you disagreed with a teammate or your manager. How did you handle it?",
    hint: "Lucien picking up my Level 1 tickets on my box. ⚠ No beats yet — write them.",
    nostory: true,
  },
  {
    id: "influence",
    q: "Tell me about a time you influenced others.",
    hint: "The sync issue — proving the bug was real to the tech team (same story as engineering/product, different framing).",
  },
  {
    id: "leadership",
    q: "Describe a time you used your leadership skills to motivate your team or colleagues.",
    hint: "Ryanair story.",
  },
  {
    id: "resilience",
    q: "Tell me about a time you showed resilience under pressure.",
    hint: "PokerStars Q1.",
  },
  {
    id: "career-goal",
    q: "Share an example of a career goal you had. What steps did you take to achieve it?",
    hint: "Becoming a Responsible Gaming specialist.",
  },
  {
    id: "difficult-decision",
    q: "Give an example of a time you had to make a difficult decision. How did you handle it?",
    hint: "Deciding to live in Poland.",
  },
  {
    id: "ambiguity",
    q: "Tell me about a time you worked in ambiguity, with no clear process, and made progress anyway.",
    hint: "⚠ No story yet — Limens or MPC build could work. Decide before the interview.",
    nostory: true,
  },
  {
    id: "why-dust",
    q: "Why Dust, and why this support role specifically?",
    hint: "Your answer, not a story — but have the two-sentence version cold.",
    nostar: true,
  },
];
