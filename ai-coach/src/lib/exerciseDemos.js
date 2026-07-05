// Self-contained "how to" demos for each tracked exercise. Everything here is
// LOCAL (no network needed to learn the move): a stick-figure animation drawn
// from two keyframe poses we interpolate between, short numbered steps, and one
// memorable cue. We ALSO offer a YouTube link for a real human demo, but it's
// strictly optional — the animation + steps work fully offline.
//
// Poses are authored in a 100×100 box (y grows downward). Each pose lists the
// 15 skeleton joints; the player eases between `rest` and `active` on a loop.

export const JOINTS = [
  "head", "neck", "pelvis",
  "shoulderL", "elbowL", "wristL",
  "shoulderR", "elbowR", "wristR",
  "hipL", "kneeL", "ankleL",
  "hipR", "kneeR", "ankleR",
];

// Bones to draw (pairs of joint names).
export const BONES = [
  ["head", "neck"], ["neck", "pelvis"],
  ["neck", "shoulderL"], ["shoulderL", "elbowL"], ["elbowL", "wristL"],
  ["neck", "shoulderR"], ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["pelvis", "hipL"], ["hipL", "kneeL"], ["kneeL", "ankleL"],
  ["pelvis", "hipR"], ["hipR", "kneeR"], ["kneeR", "ankleR"],
];

// Shorthand pose builder: pass [x,y] for each joint in JOINTS order.
const pose = (...pairs) => Object.fromEntries(JOINTS.map((j, i) => [j, pairs[i]]));

// A neutral standing front pose we can tweak per exercise.
const STAND = pose(
  [50, 12], [50, 24], [50, 52],
  [41, 26], [38, 38], [37, 50],
  [59, 26], [62, 38], [63, 50],
  [44, 52], [43, 72], [43, 92],
  [56, 52], [57, 72], [57, 92],
);
const clone = (p, over = {}) => ({ ...structuredClone(p), ...over });

export const DEMOS = {
  squat: {
    view: "Stand facing the camera, full body in frame",
    steps: [
      "Stand tall, feet shoulder-width, toes slightly out.",
      "Push your hips back and bend your knees, chest up.",
      "Sink until thighs are about parallel to the floor.",
      "Drive through your heels to stand back up.",
    ],
    cue: "Sit back like you're reaching for a chair.",
    youtube: "how to do a bodyweight squat proper form",
    rest: STAND,
    active: pose(
      [50, 28], [50, 38], [50, 60],
      [40, 40], [33, 44], [28, 40],
      [60, 40], [67, 44], [72, 40],
      [43, 60], [37, 72], [42, 92],
      [57, 60], [63, 72], [58, 92],
    ),
  },
  pushup: {
    view: "Side-on to the camera so I can see your body line",
    steps: [
      "Hands under shoulders, body in one straight line.",
      "Brace your core and glutes — no sagging hips.",
      "Lower until your elbows reach about 90°.",
      "Push the floor away to full arm extension.",
    ],
    cue: "Move like a stiff plank — only your elbows bend.",
    youtube: "how to do a push up with proper form",
    // Side view: body roughly horizontal, head to the right.
    rest: pose(
      [86, 60], [76, 60], [44, 66],
      [74, 60], [76, 74], [78, 86],
      [74, 60], [76, 74], [78, 86],
      [42, 66], [30, 72], [18, 80],
      [42, 66], [30, 72], [18, 80],
    ),
    active: pose(
      [86, 72], [76, 72], [44, 74],
      [74, 72], [73, 82], [76, 88],
      [74, 72], [73, 82], [76, 88],
      [42, 74], [30, 78], [18, 84],
      [42, 74], [30, 78], [18, 84],
    ),
  },
  bicep_curl: {
    view: "Face the camera, elbows tucked at your sides",
    steps: [
      "Stand tall, arms hanging, elbows pinned to your ribs.",
      "Curl the weights up toward your shoulders.",
      "Squeeze at the top, keep elbows still.",
      "Lower under control to a full stretch.",
    ],
    cue: "Only your forearms move — elbows stay glued.",
    youtube: "how to do a dumbbell bicep curl proper form",
    rest: clone(STAND, {
      elbowL: [38, 40], wristL: [38, 52], elbowR: [62, 40], wristR: [62, 52],
    }),
    active: clone(STAND, {
      elbowL: [38, 40], wristL: [42, 28], elbowR: [62, 40], wristR: [58, 28],
    }),
  },
  shoulder_press: {
    view: "Face the camera, start with hands at shoulder height",
    steps: [
      "Start with the weights at shoulder height, elbows bent.",
      "Brace your core, don't arch your lower back.",
      "Press straight overhead until arms are locked out.",
      "Lower with control back to your shoulders.",
    ],
    cue: "Press up, not forward — finish with arms by your ears.",
    youtube: "how to do an overhead shoulder press proper form",
    rest: clone(STAND, {
      shoulderL: [41, 26], elbowL: [36, 30], wristL: [38, 22],
      shoulderR: [59, 26], elbowR: [64, 30], wristR: [62, 22],
    }),
    active: clone(STAND, {
      shoulderL: [41, 26], elbowL: [42, 14], wristL: [45, 4],
      shoulderR: [59, 26], elbowR: [58, 14], wristR: [55, 4],
    }),
  },
  lateral_raise: {
    view: "Face the camera, arms at your sides",
    steps: [
      "Stand tall, a slight bend in your elbows.",
      "Raise both arms out to the sides.",
      "Stop level with your shoulders — no higher.",
      "Lower slowly; don't swing or shrug.",
    ],
    cue: "Lead with your elbows, stop at a 'T'.",
    youtube: "how to do a dumbbell lateral raise proper form",
    rest: clone(STAND, {
      elbowL: [38, 38], wristL: [37, 50], elbowR: [62, 38], wristR: [63, 50],
    }),
    active: clone(STAND, {
      elbowL: [30, 27], wristL: [18, 27], elbowR: [70, 27], wristR: [82, 27],
    }),
  },
  lunge: {
    view: "Side-on to the camera",
    steps: [
      "Step one foot forward into a split stance.",
      "Drop your back knee toward the floor.",
      "Front knee tracks over your ankle (about 90°).",
      "Push through the front heel back to standing.",
    ],
    cue: "Straight down, not forward — keep the torso tall.",
    youtube: "how to do a forward lunge proper form",
    rest: STAND,
    active: pose(
      [50, 18], [50, 30], [50, 56],
      [44, 32], [40, 44], [38, 54],
      [56, 32], [60, 44], [62, 54],
      [47, 56], [66, 66], [70, 88],   // front leg forward + bent
      [53, 56], [40, 74], [34, 92],   // back leg trailing, knee low
    ),
  },
  glute_bridge: {
    view: "Side-on, lying on your back with knees bent",
    steps: [
      "Lie on your back, knees bent, feet flat.",
      "Arms by your sides for support.",
      "Drive your hips up by squeezing your glutes.",
      "Make a straight line from knees to shoulders, then lower.",
    ],
    cue: "Squeeze your glutes — don't push with your lower back.",
    youtube: "how to do a glute bridge proper form",
    // Side view lying down, head to the left.
    rest: pose(
      [16, 78], [26, 78], [52, 80],
      [26, 78], [24, 86], [22, 92],
      [26, 78], [24, 86], [22, 92],
      [54, 80], [70, 74], [70, 90],
      [54, 80], [70, 74], [70, 90],
    ),
    active: pose(
      [16, 78], [26, 78], [52, 64],
      [26, 78], [24, 86], [22, 92],
      [26, 78], [24, 86], [22, 92],
      [54, 64], [70, 70], [70, 90],
      [54, 64], [70, 70], [70, 90],
    ),
  },
  crunch: {
    view: "Side-on, lying on your back with knees bent",
    steps: [
      "Lie back, knees bent, hands by your head.",
      "Curl your shoulders up off the floor.",
      "Don't yank your neck — lead with your chest.",
      "Lower slowly under control.",
    ],
    cue: "Shorten the gap between ribs and hips.",
    youtube: "how to do a crunch proper form abs",
    rest: pose(
      [16, 76], [28, 76], [56, 80],
      [28, 76], [22, 72], [16, 70],
      [28, 76], [22, 72], [16, 70],
      [58, 80], [74, 72], [74, 88],
      [58, 80], [74, 72], [74, 88],
    ),
    active: pose(
      [30, 64], [36, 68], [56, 80],
      [36, 68], [30, 64], [26, 62],
      [36, 68], [30, 64], [26, 62],
      [58, 80], [74, 72], [74, 88],
      [58, 80], [74, 72], [74, 88],
    ),
  },
  jumping_jack: {
    view: "Face the camera, whole body in frame",
    steps: [
      "Start with feet together, arms at your sides.",
      "Jump your feet out wide as your arms sweep overhead.",
      "Jump back to feet together, arms down.",
      "Stay light and find a steady rhythm.",
    ],
    cue: "Arms all the way up, land soft.",
    youtube: "how to do jumping jacks proper form",
    rest: clone(STAND, {
      elbowL: [40, 36], wristL: [41, 48], elbowR: [60, 36], wristR: [59, 48],
      hipL: [47, 52], kneeL: [46, 72], ankleL: [46, 92],
      hipR: [53, 52], kneeR: [54, 72], ankleR: [54, 92],
    }),
    active: clone(STAND, {
      elbowL: [38, 16], wristL: [42, 6], elbowR: [62, 16], wristR: [58, 6],
      hipL: [44, 52], kneeL: [34, 72], ankleL: [26, 90],
      hipR: [56, 52], kneeR: [66, 72], ankleR: [74, 90],
    }),
  },
  plank: {
    view: "Side-on so I can see your whole body line",
    steps: [
      "Forearms under your shoulders, on your toes.",
      "Make one straight line from head to heels.",
      "Brace your abs and squeeze your glutes.",
      "Breathe steadily and hold the position.",
    ],
    cue: "No sagging, no piking — flat as a board.",
    youtube: "how to do a forearm plank proper form",
    isHold: true,
    rest: pose(
      [86, 58], [76, 60], [44, 66],
      [74, 60], [72, 72], [72, 84],
      [74, 60], [72, 72], [72, 84],
      [42, 66], [30, 72], [18, 80],
      [42, 66], [30, 72], [18, 80],
    ),
    // Subtle "breathing" target — barely different so the hold looks alive.
    active: pose(
      [86, 59], [76, 61], [44, 67],
      [74, 61], [72, 73], [72, 85],
      [74, 61], [72, 73], [72, 85],
      [42, 67], [30, 73], [18, 81],
      [42, 67], [30, 73], [18, 81],
    ),
  },
};

export function demoFor(id) {
  return DEMOS[id] || null;
}

export function youtubeUrl(query) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
}
