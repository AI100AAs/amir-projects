export interface RepairStep {
  id: string;
  title: string;
  description: string;
  tip?: string;
  warning?: string;
}

export interface RepairGuide {
  id: string;
  componentId: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedTime: string;
  tools: string[];
  steps: RepairStep[];
}

export interface BikeComponent {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const bikeComponents: BikeComponent[] = [
  {
    id: "front-wheel",
    name: "Front Wheel",
    description: "Tire, tube, spokes, and hub",
    icon: "circle",
  },
  {
    id: "rear-wheel",
    name: "Rear Wheel",
    description: "Tire, tube, spokes, hub, and cassette",
    icon: "circle",
  },
  {
    id: "brakes",
    name: "Brakes",
    description: "Brake pads, cables, and calipers",
    icon: "disc",
  },
  {
    id: "chain",
    name: "Chain & Drivetrain",
    description: "Chain, derailleur, and gears",
    icon: "link",
  },
  {
    id: "seat",
    name: "Seat & Seatpost",
    description: "Saddle, seatpost, and clamp",
    icon: "seat",
  },
  {
    id: "handlebars",
    name: "Handlebars & Stem",
    description: "Bars, stem, grips, and headset",
    icon: "handlebar",
  },
];

export const repairGuides: RepairGuide[] = [
  {
    id: "fix-flat-front",
    componentId: "front-wheel",
    title: "Fix a Flat Tire (Front)",
    description:
      "Learn how to remove the front wheel, find the puncture, and patch or replace the inner tube.",
    difficulty: "Easy",
    estimatedTime: "20-30 min",
    tools: [
      "Tire levers (2)",
      "Patch kit or new tube",
      "Bike pump",
      "Bucket of water (optional)",
    ],
    steps: [
      {
        id: "ff-1",
        title: "Remove the front wheel",
        description:
          "Open the quick-release lever or loosen the axle nuts. Lift the bike by the handlebars and guide the wheel out of the fork dropouts. If your bike has rim brakes, open the brake caliper first to give the tire clearance.",
        tip: "Lay the bike on its left side (drive side up) to avoid damaging the derailleur.",
      },
      {
        id: "ff-2",
        title: "Deflate the tube completely",
        description:
          "Press the valve core to release any remaining air. For Presta valves, unscrew the tip first, then press down. For Schrader valves, press the center pin.",
      },
      {
        id: "ff-3",
        title: "Remove the tire from the rim",
        description:
          "Insert a tire lever under the bead of the tire and hook it onto a spoke. Insert a second lever a few inches away and slide it around the rim to unseat one side of the tire. Remove the tube from inside the tire.",
        warning:
          "Be careful not to pinch the tube between the lever and rim, which can cause additional punctures.",
        tip: "Work the lever away from you for better leverage. Plastic levers are less likely to damage the rim than metal ones.",
      },
      {
        id: "ff-4",
        title: "Find the puncture",
        description:
          "Inflate the removed tube slightly and listen/feel for air escaping. Submerge it in water and look for bubbles. Once found, mark the hole. Check the corresponding area inside the tire for the cause (thorn, glass, wire).",
        warning:
          "Always check the inside of the tire for debris. A leftover thorn will immediately puncture your new or patched tube.",
      },
      {
        id: "ff-5",
        title: "Patch or replace the tube",
        description:
          "For patching: roughen the area around the hole with sandpaper, apply vulcanizing glue, wait until tacky (about 1 minute), then press the patch firmly for 30 seconds. For replacement: slightly inflate the new tube so it holds its shape.",
        tip: "A slightly inflated tube is easier to install because it won't twist or get pinched.",
      },
      {
        id: "ff-6",
        title: "Reinstall the tire and tube",
        description:
          "Insert the valve through the rim hole. Tuck the tube inside the tire. Starting at the valve, work the tire bead back onto the rim using your thumbs. The last section is the hardest — use your palms to roll the bead over the rim edge.",
        warning:
          "Avoid using tire levers to reinstall the tire, as you may pinch and puncture the tube.",
      },
      {
        id: "ff-7",
        title: "Inflate and check",
        description:
          "Inflate to the recommended PSI (printed on the tire sidewall). Check that the tire bead is seated evenly around the rim on both sides. Spin the wheel and look for any bulges or unevenness.",
        tip: "Most commuter tires run between 40-65 PSI. Higher pressure = less rolling resistance but harsher ride.",
      },
      {
        id: "ff-8",
        title: "Reinstall the wheel",
        description:
          "Guide the wheel back into the fork dropouts. Make sure it's centered and fully seated. Close the quick-release lever (it should leave an imprint on your palm when closed) or tighten axle nuts. Re-engage the brake if you opened it.",
        warning:
          "Always do a safety check: squeeze the front brake and rock the bike forward/backward. The wheel should not move in the dropouts.",
      },
    ],
  },
  {
    id: "fix-flat-rear",
    componentId: "rear-wheel",
    title: "Fix a Flat Tire (Rear)",
    description:
      "The rear wheel is trickier because of the chain and gears. This guide walks you through the process.",
    difficulty: "Medium",
    estimatedTime: "25-40 min",
    tools: [
      "Tire levers (2)",
      "Patch kit or new tube",
      "Bike pump",
      "Wrench (if axle nuts)",
    ],
    steps: [
      {
        id: "rf-1",
        title: "Shift to the smallest rear cog",
        description:
          "Before removing the wheel, shift your gears so the chain is on the smallest sprocket at the back. This gives the most slack and makes removal and reinstallation much easier.",
        tip: "Pedal forward with your hand while shifting to let the derailleur move the chain.",
      },
      {
        id: "rf-2",
        title: "Remove the rear wheel",
        description:
          "Open the quick-release or loosen axle nuts. Pull the rear derailleur back with your right hand to create clearance, then lift the wheel up and out. The chain will drop off the smallest cog.",
        tip: "Take a photo of how the chain routes through the derailleur before removing the wheel. This helps during reinstallation.",
      },
      {
        id: "rf-3",
        title: "Deflate and remove the tire",
        description:
          "Deflate the tube fully. Use tire levers to unseat one side of the tire from the rim. Pull out the old tube.",
        warning:
          "Be extra careful with the valve area — some rims have sharp edges around the valve hole.",
      },
      {
        id: "rf-4",
        title: "Find the puncture and inspect tire",
        description:
          "Inflate the old tube slightly and find the leak using the water method or by feeling for air. Inspect the inside and outside of the tire for the cause of the flat.",
        warning:
          "Rear flats are often caused by pinch flats (snake bites) from hitting potholes. Check that your tire pressure is adequate for your weight.",
      },
      {
        id: "rf-5",
        title: "Patch or replace the tube",
        description:
          "Patch the tube following the same process as a front wheel repair, or install a new tube. Slightly inflate before installation.",
      },
      {
        id: "rf-6",
        title: "Reinstall tire and tube",
        description:
          "Tuck the tube into the tire, then work the tire bead back onto the rim starting from the valve. Use your thumbs and palms — avoid levers for the final seating.",
      },
      {
        id: "rf-7",
        title: "Inflate and inspect",
        description:
          "Inflate to the recommended PSI. Check that the bead is seated evenly and the tube isn't pinched between the tire and rim.",
      },
      {
        id: "rf-8",
        title: "Reinstall the rear wheel",
        description:
          "Pull the derailleur back, guide the chain onto the smallest cog, and lower the wheel into the dropouts. Ensure the wheel is centered between the chainstays. Close the quick-release or tighten nuts.",
        warning:
          "Make sure the chain is on the correct side of the derailleur tab. A misrouted chain will cause shifting problems.",
      },
      {
        id: "rf-9",
        title: "Test gears and brakes",
        description:
          "Lift the rear wheel and pedal by hand, shifting through all gears. Check that the brakes engage properly. Take a short test ride in a safe area.",
      },
    ],
  },
  {
    id: "adjust-brakes",
    componentId: "brakes",
    title: "Adjust Rim Brakes",
    description:
      "Squeaky, weak, or rubbing brakes? Learn how to adjust your rim brakes for safe, confident stopping.",
    difficulty: "Medium",
    estimatedTime: "15-25 min",
    tools: ["5mm Allen key", "Phillips screwdriver", "Cable puller (optional)", "Rag"],
    steps: [
      {
        id: "br-1",
        title: "Inspect brake pads",
        description:
          "Squeeze the brake lever and observe where the pads contact the rim. Pads should hit the center of the braking surface, not the tire or below the rim. Check pad thickness — if the grooves are gone, replace them.",
        warning:
          "Brake pads worn past their wear indicators can damage your rims and dramatically reduce stopping power.",
      },
      {
        id: "br-2",
        title: "Check cable tension",
        description:
          "Squeeze the brake lever. It should engage about 1-2 inches from the handlebar. If it pulls all the way to the bar, the cable is too loose. If the brakes drag on the rim, the cable is too tight.",
        tip: "Use the barrel adjuster on the brake lever for fine-tuning. Turn counterclockwise to increase tension.",
      },
      {
        id: "br-3",
        title: "Adjust cable tension at the caliper",
        description:
          "Loosen the cable anchor bolt on the brake caliper with a 5mm Allen key. Pull the cable taut with pliers (or a cable puller) and retighten the bolt. The brake pads should be about 1-2mm from the rim on each side.",
        tip: "Hold the brake pads against the rim while tightening the cable to get the right tension automatically.",
      },
      {
        id: "br-4",
        title: "Center the brake caliper",
        description:
          "If one pad is closer to the rim than the other, loosen the mounting bolt that holds the brake to the frame/fork. Squeeze the brake lever to center the caliper, then tighten the mounting bolt while holding the lever.",
        tip: "Some brakes have a small spring tension adjustment screw on each side. Turn the screw on the side that's too close to the rim clockwise to increase spring tension and move the pad away.",
      },
      {
        id: "br-5",
        title: "Adjust pad toe-in",
        description:
          "Brake pads should contact the rim with a slight toe-in — the front of the pad touches first. This prevents squealing. Place a thin business card under the rear of the pad while tightening to achieve this angle.",
        tip: "If your brakes squeal, toe-in is usually the fix. Even a tiny angle makes a big difference.",
      },
      {
        id: "br-6",
        title: "Test the brakes",
        description:
          "Squeeze each lever firmly. The brake should engage solidly without the lever reaching the handlebar. Spin the wheel — it should spin freely without brake rub. Take a slow test ride and brake firmly to verify stopping power.",
        warning:
          "Always test brakes at low speed before riding in traffic. If braking feels weak or spongy, re-check all adjustments.",
      },
    ],
  },
  {
    id: "clean-lube-chain",
    componentId: "chain",
    title: "Clean & Lubricate Chain",
    description:
      "A clean, lubed chain shifts better, lasts longer, and makes your ride quieter and more efficient.",
    difficulty: "Easy",
    estimatedTime: "10-15 min",
    tools: ["Chain cleaner tool or rag", "Degreaser", "Bike chain lube", "Old toothbrush"],
    steps: [
      {
        id: "ch-1",
        title: "Assess chain condition",
        description:
          "Shift to the big chainring and a middle rear cog. Backpedal and look at the chain. If it's black and gritty, it needs cleaning. Check for stiff links or rust spots.",
        tip: "Use a chain checker tool to measure wear. Replace the chain if it's stretched beyond 0.75%.",
      },
      {
        id: "ch-2",
        title: "Clean the chain",
        description:
          "Apply degreaser to the chain while backpedaling. Use a chain cleaning tool filled with degreaser, or wrap a rag soaked in degreaser around the chain and backpedal through it. Use an old toothbrush to scrub between the links.",
        warning:
          "Avoid getting degreaser on your brake pads or rotors. It will contaminate them and cause brake failure.",
      },
      {
        id: "ch-3",
        title: "Rinse and dry",
        description:
          "Wipe the chain clean with a dry rag, backpedaling to get all sections. Let it air dry for a few minutes. The chain should look silver or dark grey, not black.",
      },
      {
        id: "ch-4",
        title: "Apply lubricant",
        description:
          "Apply one drop of chain lube to each roller (the round part between the plates) while backpedaling. Go around the entire chain once. Use wet lube for rainy conditions, dry lube for dusty/dry conditions.",
        tip: "Less is more. You want lube inside the rollers where the chain actually pivots, not coating the outside where it attracts dirt.",
      },
      {
        id: "ch-5",
        title: "Wipe off excess",
        description:
          "Wait 2-3 minutes for the lube to penetrate, then wrap a clean rag around the chain and backpedal to remove all excess lube from the outside. The chain should feel slightly oily, not wet.",
        warning:
          "Excess lube on the outside of the chain attracts dirt and creates a grinding paste that accelerates wear.",
      },
      {
        id: "ch-6",
        title: "Check shifting",
        description:
          "Pedal and shift through all gears. The chain should shift smoothly and quietly. If it's noisy, the lube may need more time to penetrate, or you may need to adjust the derailleur.",
      },
    ],
  },
  {
    id: "adjust-seat",
    componentId: "seat",
    title: "Adjust Seat Height & Position",
    description:
      "Proper saddle height prevents knee pain and makes pedaling more efficient. Get your fit right.",
    difficulty: "Easy",
    estimatedTime: "5-10 min",
    tools: ["Allen key set (usually 4mm or 5mm)", "Tape measure"],
    steps: [
      {
        id: "se-1",
        title: "Check current seat height",
        description:
          "Sit on the saddle with one pedal at the bottom of its stroke (6 o'clock position). Your heel should rest on the pedal with your leg completely straight. When you move the ball of your foot to the pedal, there should be a slight bend in the knee.",
        tip: "A saddle that's too low causes knee pain in front. Too high causes pain behind the knee.",
      },
      {
        id: "se-2",
        title: "Loosen the seatpost clamp",
        description:
          "Use the appropriate Allen key to loosen the seatpost clamp bolt. Don't remove it completely — just loosen enough that the seatpost can slide.",
        warning:
          "Never raise the seatpost above the minimum insertion line marked on the post. Riding with too little post in the frame can damage the frame and cause the post to snap.",
      },
      {
        id: "se-3",
        title: "Adjust the height",
        description:
          "Slide the seatpost up or down to the desired height. Make small adjustments (5mm at a time). A good starting point is having your inseam measurement x 0.883 as the distance from the center of the bottom bracket to the top of the saddle.",
      },
      {
        id: "se-4",
        title: "Align the saddle",
        description:
          "The saddle should be level (use a phone level app or eyeball it) and pointing straight ahead. The nose of the saddle should align with the top tube of the frame.",
        tip: "A slightly nose-down angle can relieve pressure for some riders, but too much tilt causes you to slide forward and put weight on your hands.",
      },
      {
        id: "se-5",
        title: "Tighten and test",
        description:
          "Tighten the seatpost clamp bolt securely. Sit on the bike and pedal. If your hips rock side to side, the saddle is too high. If your knees feel cramped, it's too low.",
        warning:
          "Always check that the quick-release or bolt is tight enough. A loose seatpost can slip during riding, which is dangerous in traffic.",
      },
    ],
  },
  {
    id: "adjust-handlebars",
    componentId: "handlebars",
    title: "Adjust Handlebars & Stem",
    description:
      "Handlebar height and angle affect your comfort and control. Dial in the right position for your riding style.",
    difficulty: "Easy",
    estimatedTime: "10-15 min",
    tools: ["Allen key set (4mm, 5mm, 6mm)", "Torque wrench (recommended)"],
    steps: [
      {
        id: "hb-1",
        title: "Assess your current position",
        description:
          "Sit on the bike in your normal riding position. Your elbows should have a slight bend, your back should be at a comfortable angle, and you shouldn't feel excessive weight on your hands.",
        tip: "For commuting, a more upright position (higher bars) gives better visibility in traffic.",
      },
      {
        id: "hb-2",
        title: "Adjust stem height (threadless headset)",
        description:
          "To raise or lower the stem, you'll need to rearrange the spacers above and below the stem on the steerer tube. Loosen the stem bolts and the top cap bolt. Move spacers below the stem to raise it, or above to lower it.",
        warning:
          "Always ensure at least one spacer above the stem. The top cap bolt needs something to press against to preload the headset bearings.",
      },
      {
        id: "hb-3",
        title: "Adjust handlebar angle",
        description:
          "Loosen the faceplate bolts on the front of the stem (the part that clamps the handlebar). Rotate the bar to your preferred angle. For flat bars, a slight upward sweep is comfortable. For drop bars, the drops should be roughly level with the ground.",
        tip: "Mark the bar position with tape before loosening, so you can return to it if the new position doesn't feel right.",
      },
      {
        id: "hb-4",
        title: "Align and tighten",
        description:
          "Make sure the handlebar is centered in the stem clamp. Tighten the faceplate bolts evenly in an X pattern to avoid crushing the bar. If you have a torque wrench, follow the manufacturer's torque spec (usually 5-6 Nm).",
        warning:
          "Overtightening can crack carbon fiber handlebars and stems. Always use a torque wrench with carbon components.",
      },
      {
        id: "hb-5",
        title: "Preload the headset",
        description:
          "Tighten the top cap bolt just until there's no play in the headset (check by holding the front brake and rocking the bike). Then tighten the stem bolts. The top cap should not be bearing the load — the stem bolts hold everything in place.",
        tip: "If the headset feels notchy when turning, the top cap is too tight. Back it off slightly.",
      },
      {
        id: "hb-6",
        title: "Test ride",
        description:
          "Take a short ride and pay attention to your comfort. Check that the handlebar doesn't rotate under hard braking. If anything feels off, readjust.",
      },
    ],
  },
];

export function getGuideByComponent(componentId: string): RepairGuide | undefined {
  return repairGuides.find((g) => g.componentId === componentId);
}

export function getComponentById(id: string): BikeComponent | undefined {
  return bikeComponents.find((c) => c.id === id);
}
