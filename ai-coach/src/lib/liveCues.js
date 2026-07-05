// Short spoken coaching phrases for real-time cueing, per exercise + phase.
// kind: "go" (moving into the rep, not deep enough yet), "deep" (at the bottom/
// peak), "up" (returning), "hold" (isometric), "correct" (form fault), "encourage".

const GO = {
  squat: ["Lower", "Sit back and down", "Bend your knees", "Go a little deeper", "Keep going down"],
  pushup: ["Lower your chest", "Bend your elbows", "All the way down"],
  bicep_curl: ["Curl it up", "Squeeze it up", "All the way up"],
  shoulder_press: ["Press up", "Push it overhead", "All the way up"],
  lateral_raise: ["Raise them up", "Up to shoulder height", "Lift those arms"],
  lunge: ["Drop your back knee", "Lower down", "Sink into it"],
  glute_bridge: ["Lift your hips", "Drive your hips up", "Higher"],
  crunch: ["Curl up", "Lift your shoulders", "Crunch up"],
  jumping_jack: ["Arms all the way up", "Big jumps", "Reach up high"],
};
const DEEP = {
  squat: ["Great depth", "That's it", "Nice and low", "Perfect"],
  pushup: ["Chest to the floor", "Good", "All the way down"],
  bicep_curl: ["Squeeze it", "Nice", "Hold that squeeze"],
  shoulder_press: ["Locked out", "All the way up", "Good"],
  lateral_raise: ["Hold it there", "Good height", "Nice"],
  lunge: ["Nice depth", "Good", "Right there"],
  glute_bridge: ["Squeeze your glutes", "Hold it", "Good"],
  crunch: ["Squeeze your abs", "Good", "Right there"],
  jumping_jack: ["There you go", "Nice", "Good"],
};
const UP = {
  squat: ["Drive up", "Stand tall", "Push through your heels", "Up you go"],
  pushup: ["Push up", "Press the floor away", "Lock it out"],
  bicep_curl: ["Lower it slow", "Control it down", "Full extension"],
  shoulder_press: ["Lower with control", "Back to your shoulders"],
  lateral_raise: ["Lower slowly", "Control them down"],
  lunge: ["Push back up", "Drive up", "Back to the top"],
  glute_bridge: ["Lower with control", "Down slow"],
  crunch: ["Lower slowly", "Control it back"],
  jumping_jack: ["Keep the rhythm", "Stay light", "Keep it going"],
};
const HOLD = {
  plank: ["Hold steady", "Brace your core", "Stay tight", "You're doing good", "Keep breathing", "Hold strong"],
};
const FAULT = {
  lean: ["Chest up", "Sit back", "Don't lean forward"],
  line: ["Straighten your body", "Tighten your core", "Get in a straight line"],
  sag: ["Lift your hips", "Hips up"],
  pike: ["Drop your hips", "Flatten out"],
  toohigh: ["Not too high", "Stop at shoulder height"],
};
const ENCOURAGE = ["You're doing good", "Looking strong", "Keep it up", "Nice work", "Stay with it", "Great pace", "You've got this", "Keep going"];

const rnd = (a) => a[Math.floor(Math.random() * a.length)];

export function pickLiveCue(exId, kind, faultId) {
  if (kind === "correct") return rnd(FAULT[faultId] || ["Fix your form"]);
  if (kind === "encourage") return rnd(ENCOURAGE);
  if (kind === "hold") return rnd(HOLD[exId] || HOLD.plank);
  const pool = (kind === "go" ? GO : kind === "deep" ? DEEP : UP)[exId];
  return pool ? rnd(pool) : kind === "go" ? "Keep going" : kind === "deep" ? "Good" : "Control it";
}
