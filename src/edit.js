// Editorial layer on top of the build-6805 hero data.
// Trait order must match DIMS in model.js:
// cx, spirit, range, mobility, tank, support, cc, burst, aim, pick, engage, stealth,
// zone, summon, scale, melee, sustain, air, global, teamdep, dot, execute, push
const EDIT = {
abrams: {
  pitch: "A bull-headed bruiser who charges into the middle of the fight and refuses to go down. Siphon Life and Infernal Resilience keep him healthy while Shoulder Charge and Seismic Impact pin enemies in front of his shotgun.",
  ab: ["Drains health from nearby enemies and heals you for part of the damage.",
       "Charges forward dragging enemies along; slamming a hero into a wall stuns them.",
       "Passive defenses; part of the damage you take comes back as regen.",
       "Leaps high and crashes down, damaging and stunning enemies."],
  t: [1,1.5,0.5,2,4,0.5,3,2,1,2,4,0,0.5,0,2,4,4,1,1,0.5,1,0,1.5],
  vibe: ["noir","occult"], feel: {shotgun:1}, gim: {grab:0.6, undying:0.6}
},
apollo: {
  pitch: "A duelist built on timing. Parry an attack with Riposte, lunge through enemies with Flawless Advance, then leap out with Disengaging Sigil. His ultimate traps enemies in slow motion before devastating damage lands.",
  ab: ["Draws an exploding sigil that damages and slows, then leaps you backwards.",
       "Deflects the next attack, then dashes to a target and stuns them.",
       "A string of lunging stabs; release in the perfect window for maximum damage.",
       "A long-range slash that traps enemies in slow motion before heavy damage lands."],
  t: [2,2.5,1,4,1.5,0,2.5,4,2,3.5,3,1,0,0,2.5,3,1,2,0,0.5,0,2,1],
  vibe: ["showbiz","occult"], feel: {heavy:1}, gim: {timing:1}
},
bebop: {
  pitch: "A hook-and-combo robot. Land Grapple Arm, stick a bomb, uppercut, then melt what is left with Hyper Beam. The same hook can pull a teammate out of danger.",
  ab: ["Punches nearby enemies away; they explode where they land. Works on allies too.",
       "Attaches a bomb that gains permanent damage every time it hits a hero.",
       "Hooks the first character hit and reels them in, enemy or ally.",
       "Channels a huge laser that damages and slows."],
  t: [2,3,2,1.5,3,1.5,3.5,3.5,3,3.5,3,0,1,0,3,2.5,1.5,0.5,0,1,0,0,2.5],
  vibe: ["machine"], feel: {hose:1}, gim: {grab:1}
},
billy: {
  pitch: "A punk goat who brawls with a bat. Bashdown and Rising Ram throw enemies around, melee hits refill his ammo, and Chain Gang shackles nearby enemies to him before yanking them in.",
  ab: ["Slams the bat down, pulling enemies to the ground and knocking them up.",
       "Charges into an enemy and launches you both into the air.",
       "Melee hits refill your ammo and leave the victim Wrecked for bonus bullet damage.",
       "Chains nearby enemies to you, blocks their movement abilities, then yanks them in."],
  t: [3,1.5,0.5,3,3,0,3.5,3,1.5,2.5,4,0,0.5,0,2,4,1.5,2,0,0.5,0,0,1.5],
  vibe: ["beast"], feel: {hose:0.7, shotgun:0.5}, gim: {grab:0.8}
},
calico: {
  pitch: "A shadowy skirmisher who slips in and out of fights. Possess Ava to roam unseen on the minimap, burst with bombs and Leaping Slash, and vanish with Return to Shadows.",
  ab: ["Throws a cluster of bombs that detonate after a delay.",
       "Dashes forward and slashes all around you, healing if a hero is hit.",
       "Possess Ava the cat: growing move speed and hidden from the minimap.",
       "Turns you untargetable in the shadows, then you re-emerge dealing damage again."],
  t: [2,3,1.5,3.5,1,0,0.5,3.5,1.5,3,2.5,3,1,1,2,3,2,1,1.5,0,0,0,1.5],
  vibe: ["beast","occult"], feel: {shotgun:1}, gim: {stealth:0.9, transform:0.6}
},
celeste: {
  pitch: "A dazzling spirit caster. Mark enemies with Light Eater, call down Radiant Daggers to stack spirit damage, and shield up with a prism that silences whoever breaks it.",
  ab: ["A cone of light that makes your attacks deal extra spirit damage, with spirit lifesteal.",
       "A protective prism; if it breaks, nearby enemies are silenced and damaged.",
       "Calls down a beam of light that explodes and stacks your spirit damage on hero hits.",
       "A bouncing orb of light that slows, shortens dashes and seeks out heroes."],
  t: [2,3.5,2.5,1,1,0.5,2,2.5,2,1.5,1,0.5,2,0,3,0,2,0.5,0,0,0,0,2.5],
  vibe: ["showbiz"], feel: {heavy:1, burst:0.5}, gim: {}
},
doorman: {
  pitch: "A hotel doorman who bends the map. Link doors for your team, cart enemies into walls, and check a target into the Baroness Hotel.",
  ab: ["A bell that hits on impact, then explodes to slow enemies and ruin their accuracy.",
       "Places two linked doors; heroes and most projectiles pass through.",
       "Sends a cart that drags enemy heroes along its path.",
       "Sends a hero to the Baroness Hotel; they must reach the exit or pay extra."],
  t: [1,3,2.5,2.5,1.5,2.5,3,2,2,3,2,2,3,0,2,0,0.5,0,1.5,1.5,0,0,1.5],
  vibe: ["storybook","occult"], feel: {heavy:1}, gim: {teleport:1, trap:0.7, grab:0.6}
},
drifter: {
  pitch: "A stalker who hunts isolated heroes. Mark a target, appear behind them, and plunge the enemy team into Eternal Night so every victim is alone.",
  ab: ["A cone swipe with bonus melee damage up close.",
       "Bleeds the first target hit; recast to appear behind them.",
       "Isolated heroes leave trails and take amplified damage; their deaths grant permanent weapon damage.",
       "Blinds nearby enemies in darkness and isolates every one of them."],
  t: [3,2,1,3,1.5,0,1.5,3,1.5,4,3,2.5,0,0,2.5,2.5,1.5,0,2,0,2,2,1],
  vibe: ["occult"], feel: {shotgun:1}, gim: {stealth:0.7, teleport:0.7}
},
dynamo: {
  pitch: "A team-fight anchor. Heal the team with Rejuvenating Aurora, blink with Quantum Entanglement, and swing a fight with one well-placed Singularity.",
  ab: ["A ground pulse that damages and knocks enemies into the air.",
       "Teleport while briefly untargetable, restoring stamina.",
       "Channel to heal yourself and nearby allies.",
       "Pulls in and stuns the enemy team around you."],
  t: [2,3,2,2,3,4,4,1.5,1,0.5,3.5,0.5,1,0,1.5,0.5,2.5,0.5,0.5,3,0,0,1],
  vibe: ["machine","occult"], feel: {heavy:1}, gim: {teleport:0.7, grab:0.5}
},
geist: {
  pitch: "A caster who spends her own health as ammunition. Essence Bomb and Malice cost HP, Life Drain takes it back, and Soul Exchange swaps your health with a healthier enemy.",
  ab: ["Spend some health to lob a bomb that explodes after arming.",
       "Tether to an enemy and drain their health into yours.",
       "Spend health to fire blood shards that stack a slow and damage amplification.",
       "Swap health levels with an enemy hero."],
  t: [2,4,2,1,2.5,0.5,1.5,3.5,2,2.5,2,0,1.5,0,2.5,0,4,0,0,0,1,2,2],
  vibe: ["occult"], feel: {heavy:1}, gim: {steal:0.9}
},
graves: {
  pitch: "A necromancer who fills the map with the dead. Throw jars of Deadheads, raise walls of grasping hands, and send ghouls marching at enemy objectives while your shots steal the enemy's strength.",
  ab: ["Collects nearby deaths; throw the jar to summon Deadheads that attack enemies.",
       "Raises a wall of hands that damages and immobilizes, and summons a Ghoul.",
       "Your shots steal weapon damage and spirit resist from each target.",
       "Abilities raise Ghouls that march on the enemy base; place a gravestone that keeps spawning them."],
  t: [2,3,2,1,1.5,0,2,1,1,1,1,0,3.5,4,3,0,0.5,0,1.5,0,2,0,4],
  vibe: ["occult"], feel: {hose:1}, gim: {summon:1, trap:0.6, steal:0.8}
},
greytalon: {
  pitch: "A long-range hunter. Charged Shot pierces lines of enemies, Spirit Snare guards approaches, Rain of Arrows lifts you into the sky, and Guided Owl strikes from across the map.",
  ab: ["Charge a long-range arrow that pierces through enemies.",
       "Launch high into the air and glide, firing multishot arrows.",
       "A trap that curses, slows and silences whoever triggers it.",
       "Steer a spirit owl that explodes and stuns; kills grant permanent spirit power."],
  t: [2,2.5,4,2,1,0,2.5,3,4,3,0.5,0,2.5,0.5,3,0,0.5,3,3,0,0,1.5,2],
  vibe: ["occult"], feel: {precision:1}, gim: {trap:0.8, flight:0.8, timing:0.6}
},
haze: {
  pitch: "A stealthy gunner who melts one target at a time. Put a victim to sleep, fade out with Smoke Bomb, stack Fixation, then spin into Bullet Dance.",
  ab: ["Throws a dagger that puts the target to sleep.",
       "Turn invisible and gain sprint speed; attacking reveals you.",
       "Every bullet on a target raises your damage against it, headshots most of all.",
       "Spin into a flurry of perfectly accurate shots at everyone nearby."],
  t: [1,0.5,2,2.5,0.5,0,1.5,2,2.5,3.5,3,4,0,0,4,0,1.5,0,1,0,0,0,2],
  vibe: ["noir"], feel: {hose:1}, gim: {stealth:1}
},
holliday: {
  pitch: "A crack-shot trick shooter. Pop enemies into the air with barrels and Bounce Pads, then punish them with headshots. Spirit Lasso drags a target wherever you want them.",
  ab: ["Throws a barrel that explodes, burns and knocks enemies up; shoot it to detonate early.",
       "A pad that launches any hero; you explode on enemies where you land.",
       "Headshots deal bonus damage and slow the target.",
       "Lasso an enemy, stunning them and dragging them behind you."],
  t: [3,2,2.5,3,1.5,1,3,3.5,4,3,2.5,0,2,0,2.5,0.5,0.5,3,0,0.5,1,0,2],
  vibe: ["noir"], feel: {heavy:1}, gim: {grab:0.9, flight:0.5}
},
infernus: {
  pitch: "A fire demon who burns everything he touches. Afterburn and Napalm stack damage over time, Flame Dash chases or escapes, and Concussive Combustion stuns everyone nearby.",
  ab: ["Spews napalm that damages, slows and makes coated enemies take more from you.",
       "Dash forward, leaving a burning trail.",
       "Bullets build up a burn that ticks spirit damage.",
       "Become a living bomb that stuns everyone nearby after a short delay."],
  t: [1,2.5,2,2.5,2.5,0,2.5,1.5,1.5,1.5,3,0,2,0,3,0,2,0,0,0,4,0,2.5],
  vibe: ["occult","noir"], feel: {hose:1}, gim: {}
},
ivy: {
  pitch: "A gargoyle built for a partner. Link with an ally through Kudzu Connection, turn to stone to survive and stun, and fly a teammate into the fight with Air Drop.",
  ab: ["A patch of thorns that damages and slows enemies inside it.",
       "Tether to an ally so you both gain bonuses and share healing.",
       "Turn to impervious stone and slam down, stunning nearby enemies and healing you.",
       "Carry an ally into the air and drop them on enemies for an explosion."],
  t: [3,2,2.5,2.5,2,3.5,3,1.5,1.5,1.5,2.5,0,2.5,0,2,0,2,3,0.5,4,1,0,1.5],
  vibe: ["beast","storybook"], feel: {hose:1}, gim: {flight:0.8, transform:0.5, trap:0.5, undying:0.4}
},
kelvin: {
  pitch: "An arctic explorer who keeps his team alive and moving. Heal with Frost Grenade, glide the team around on Ice Path, and drop a Frozen Shelter to save a fight.",
  ab: ["An icy burst that heals allies and damages and slows enemies.",
       "A floating ice trail that speeds up you and your allies.",
       "A sustained beam that steadily slows movement and fire rate.",
       "An impenetrable dome that rapidly heals allies inside and slows enemies."],
  t: [2,3,2,3,3,4,3,1,1,0.5,2.5,0,3,0,2,0.5,2,2,1,2,1,0,2],
  vibe: ["storybook","occult"], feel: {heavy:1}, gim: {trap:0.4}
},
lash: {
  pitch: "An arrogant aerial brawler. Grapple across the sky, dive down with Ground Strike, and lift several enemies at once with Death Slam.",
  ab: ["Slam the ground; from the air you dive down and hit harder the farther you fall.",
       "Whip yourself through the air to a target and reset your air jumps and dashes.",
       "Whip enemies in front of you and heal from the damage.",
       "Latch whips onto several enemies, lift them and slam them into the ground."],
  t: [3,3,1.5,4,2,0,3.5,3.5,2.5,2.5,4,0,0,0,2,1.5,2,4,1,1,0,0,1],
  vibe: ["showbiz"], feel: {burst:1}, gim: {flight:0.9, grab:0.8}
},
mcginnis: {
  pitch: "An engineer who turns any position into a fortress. Drop turrets, heal with Medicinal Specter, split the enemy team with Spectral Wall and rain rockets with Heavy Barrage.",
  ab: ["Deploys an automated turret that shoots enemies.",
       "Deploys a spirit that heals nearby allies.",
       "A wall that slows enemies, then erupts to split the terrain in two.",
       "Rains homing rockets on a target area."],
  t: [1,2.5,2.5,0.5,2.5,3,2.5,1.5,1,1,1,0,4,3.5,2,0.5,1.5,0,0,1,1,0,3.5],
  vibe: ["machine"], feel: {hose:1}, gim: {summon:1, trap:0.9}
},
mina: {
  pitch: "A fragile but nimble harasser. Every bullet adds spirit damage, Love Bites bursts targets, Rake finishes the wounded, and Sanguine Retreat whisks you away untargetable.",
  ab: ["An umbrella slash that hits harder on wounded targets and heals per kill.",
       "Disperse and fly untargetable to a target spot; can be recast.",
       "Bullets add spirit damage and build up to a burst bite.",
       "Releases seeking bats that damage and silence; the swarm grows permanently."],
  t: [3,3,2.5,3,0.5,0,2,3,2.5,2.5,1.5,1.5,0.5,1,3,1,1.5,2.5,0,0,0,2.5,3],
  vibe: ["occult","showbiz"], feel: {heavy:0.5, hose:0.5}, gim: {flight:0.6, teleport:0.5, summon:0.4}
},
mirage: {
  pitch: "A desert traveller who can be anywhere. Traveler teleports you across the map, Dust Devil lifts enemies, Fire Scarabs sustain you, and Djinn's Mark rewards steady shooting.",
  ab: ["Infest an enemy with scarabs that steal life and weaken their damage.",
       "Become a whirlwind that damages, slows and lifts enemies.",
       "Shots stack marks that multiply in damage; consume them for a burst.",
       "Pick a spot on the minimap and teleport there."],
  t: [2,2,2.5,3,1.5,1.5,2,2.5,3,2.5,2.5,0.5,0,0,3,0,2.5,1,4,0.5,1,0,2],
  vibe: ["occult"], feel: {heavy:1}, gim: {teleport:1, steal:0.5}
},
mokrill: {
  pitch: "A tunnelling tag-team. Burrow under the enemy, pop up in their midst, disarm them with Sand Blast, and hold a victim in place with Combo.",
  ab: ["Damages nearby enemies and heals you, more against heroes.",
       "Tunnel underground with armor and speed, then spin out to knock enemies up.",
       "Sprays sand that disarms enemies in front of you.",
       "Hold a hero in place and pummel them; a kill grants permanent max health."],
  t: [3,3,1,3,3.5,0,4,2.5,1,3.5,4,1.5,0,0,2.5,1,3,0.5,1,1,1,0,1],
  vibe: ["beast"], feel: {shotgun:1}, gim: {stealth:0.5}
},
paige: {
  pitch: "A storybook support. Shield an ally with Plot Armor, root enemies with Captivating Read, burn a line with Bookwyrm, and send knights charging across the entire city with Rallying Charge.",
  ab: ["Conjures a dragon that flies forward leaving a burning trail.",
       "Gives an ally a barrier and bonus weapon damage while it holds.",
       "Marks an area that slows, then detonates to immobilize.",
       "Spectral knights charge across the entire city, healing allies and damaging enemies."],
  t: [1,3.5,3,1,1,4,2.5,1.5,2,1,1,0,2.5,1,2,0,0.5,0,4,2.5,1,0,2],
  vibe: ["storybook"], feel: {heavy:1}, gim: {summon:0.4}
},
paradox: {
  pitch: "A time-bending tactician. Slow enemies with Pulse Grenade, freeze their bullets with Time Wall, time-stop them with Kinetic Carbine, and swap an enemy into your team.",
  ab: ["A grenade that pulses damage and time slow, stacking your damage amp on victims.",
       "A wall that freezes enemy bullets and projectiles, powers up friendly shots and slows enemies who touch it.",
       "A charged time-energy shot that time-stops enemies hit.",
       "Fire a projectile that swaps your position with an enemy hero."],
  t: [3,2,3,1.5,1,1.5,3.5,3,3.5,3.5,2,0.5,2.5,0,2.5,0,0.5,0.5,0,1.5,0.5,0,1.5],
  vibe: ["machine"], feel: {burst:1}, gim: {teleport:0.9, trap:0.8, timing:0.5}
},
pocket: {
  pitch: "A slippery spirit diver. Float while firing Barrage, teleport to your Flying Cloak, hide in your suitcase, and let Affliction wear everyone down.",
  ab: ["Channel a volley of projectiles that stacks your damage amp; floats you if airborne.",
       "Launch a damaging cloak and teleport to it.",
       "Hide inside your suitcase, then burst out dealing damage.",
       "Applies damage over time to all nearby enemies."],
  t: [2,3.5,1.5,3.5,1,0,1,3.5,1.5,2,3,2.5,1.5,0,2,0.5,0.5,3,0.5,0,3,0,2.5],
  vibe: ["storybook","occult"], feel: {shotgun:1}, gim: {teleport:0.7, stealth:0.6, flight:0.6}
},
rem: {
  pitch: "A tiny, sleepy helper. Ride along on allies to heal them, send Lil Helpers around the map, and put enemies to sleep through walls with Naptime.",
  ab: ["A pillow throw with heavy knockback; hits cut your other cooldowns.",
       "Hop onto an ally and nap alongside them, healing you both.",
       "Send helpers to grab boxes, do Sinner's Sacrifices, or support allies and troopers.",
       "A gaze through walls that slows, then puts enemies to sleep before heavy damage."],
  t: [3,3,2.5,3,1,4,3,1.5,1.5,1,1,1.5,1.5,3,1.5,0,2,1,2.5,4,0,0,2.5],
  vibe: ["storybook"], feel: {heavy:1}, gim: {summon:0.9}
},
seven: {
  pitch: "A storm-caller who punishes clumped teams. Lightning Ball and Power Surge clear waves, Static Charge stuns groups, and Storm Cloud fries everyone in a huge radius.",
  ab: ["A slow lightning orb that damages everything in its radius.",
       "Charge an enemy; after a delay it stuns and damages everyone around them.",
       "Your shots chain shock damage to nearby enemies.",
       "Channel an expanding storm that damages all enemies in line of sight."],
  t: [1,3.5,2.5,1,2,0,2.5,2,1.5,0.5,2.5,0,3,0,3,0,1,1,0,0,2,0,3.5],
  vibe: ["machine","noir"], feel: {burst:1}, gim: {}
},
shiv: {
  pitch: "A hit-and-run executioner. Bleed targets with Serrated Knives, dash through them, push incoming damage into the future with Bloodletting, and finish them with Killing Blow.",
  ab: ["Throw knives that stack a bleed.",
       "Dash through enemies, damaging them and shredding spirit resist.",
       "Take part of incoming damage over time instead of all at once.",
       "Leap at a hero and execute them below the kill threshold. Dealing damage fills your rage."],
  t: [3,2.5,1.5,3,2.5,0,0.5,3,2,3.5,3,0,0,0,2.5,1.5,2,0.5,0,0,3,4,1],
  vibe: ["noir"], feel: {shotgun:1}, gim: {undying:0.6}
},
silver: {
  pitch: "A gunslinger with a beast inside. Slam Fire, Boot Kick and Entangling Bola win gunfights, and once bloodlust fills she transforms with Lycan Curse.",
  ab: ["Instantly reload and fire faster, with bonus damage based on the target's health.",
       "Dash-kick an enemy and mark them; shooting the mark adds spirit damage.",
       "A bola that slows and blocks movement abilities and stamina.",
       "Build bloodlust to transform into a werewolf with new abilities and more health."],
  t: [1,1.5,2.5,2.5,3,0,2,3,2.5,2.5,3,0,0,0,2.5,2.5,1.5,0,0,0,0,1,2],
  vibe: ["beast"], feel: {precision:1}, gim: {transform:1}
},
sinclair: {
  pitch: "The most complex kit in the game. A stage magician who confuses enemies with a Spectral Assistant, turns them into rabbits, and borrows their ultimate with Audience Participation.",
  ab: ["A guided bolt that grows stronger the farther it travels.",
       "Summon an Assistant that shoots when you do; swap places with it.",
       "Turns every enemy in an area into a rabbit.",
       "Copy an enemy hero's ultimate and use it yourself."],
  t: [4,3,3,2,1,0.5,3,2.5,2.5,2,1.5,3,1.5,2.5,2,0,0.5,0,0,0.5,0,0,1.5],
  vibe: ["showbiz"], feel: {burst:1}, gim: {steal:1, summon:0.8, teleport:0.7}
},
venator: {
  pitch: "A monster hunter whose abilities hit with weapon damage. Burn with Consecrating Grenade, pin enemies to walls with Gutshot, trap them with a Snap Trap, and execute with Ira Domini.",
  ab: ["A bouncing grenade that burns enemies and cuts their healing.",
       "A shotgun blast that pushes enemies back and stuns them against walls.",
       "A trap that immobilizes and reveals the first enemy to touch it.",
       "Load three empowered stakes; the last one executes low-health enemies."],
  t: [2,1.5,2.5,1,2,0,2.5,3,3,3,1.5,0,2,0,3,1,0.5,0,0,0,1.5,3,2],
  vibe: ["occult"], feel: {precision:1, hose:0.5}, gim: {trap:0.8}
},
victor: {
  pitch: "A reanimated brawler who feeds on pain. Taking damage charges his Pain Battery, Aura of Suffering hurts everyone including himself, and Shocking Reanimation brings him back from lethal damage.",
  ab: ["Taking damage charges a battery you fire as shocking bolts.",
       "Hurt yourself to gain regen and move speed.",
       "A growing damage aura that hurts enemies and you.",
       "On lethal damage, channel and reanimate, stunning nearby enemies."],
  t: [2,3,1,1.5,4,0,2,1.5,1,1,3.5,0,1.5,0,2,1,3.5,0,0,0,3,0,2.5],
  vibe: ["machine","occult"], feel: {hose:0.8}, gim: {undying:1}
},
vindicta: {
  pitch: "A flying sniper. Take to the sky with Flight, pin targets with Stake, bleed them with Crow Familiar, and finish injured heroes with Assassinate from across the map.",
  ab: ["Tethers enemies to the spot where the stake lands.",
       "Fly, gaining bonus spirit damage on your shots and extra item range.",
       "Your crow bleeds a target and lowers its bullet resist.",
       "A scoped long-range shot with bonus damage against low-health enemies."],
  t: [1,1.5,4,3,0.5,0,2,3.5,4,4,0.5,0.5,1,0.5,3.5,0,0.5,4,2.5,0,2,3,1.5],
  vibe: ["occult"], feel: {precision:1}, gim: {flight:1, timing:0.5}
},
viscous: {
  pitch: "A bouncing blob of goo. Cube an ally or yourself to save them, punch enemies into the air, and roll into the enemy team as an armoured Goo Ball.",
  ab: ["A bouncing goo ball that leaves slowing puddles.",
       "Encase yourself or an ally in protective, healing goo.",
       "A giant fist that knocks up and slows everyone in the area.",
       "Roll as a tanky goo ball that stuns enemies on impact."],
  t: [2,3.5,2,3,3,3,3.5,2.5,2,2,3.5,0.5,1.5,0,2,1.5,1.5,2,0,1,0,0,1.5],
  vibe: ["beast","storybook"], feel: {heavy:0.8}, gim: {transform:0.8}
},
vyper: {
  pitch: "A rapid-fire assassin. Slide into range with Slither, stack Screwjab Daggers, poison with Lethal Venom, and petrify with Petrifying Bola before unloading.",
  ab: ["A dagger whose damage and slow stack on repeat hits.",
       "A delayed venom that hits harder the more health the target is missing.",
       "Longer, faster slides that can go uphill.",
       "An explosive bola that slows the area and petrifies on a direct hit."],
  t: [1,1.5,1.5,3,1.5,0,3,2.5,2,3.5,3,1,0.5,0,3.5,0,1,0,0,0,2,2.5,2],
  vibe: ["beast"], feel: {hose:1}, gim: {}
},
warden: {
  pitch: "A relentless enforcer. Weaken enemies with Alchemical Flask, root anyone who runs with Binding Word, and drain a whole team with Last Stand.",
  ab: ["A flask that damages and cuts enemies' weapon damage and speed.",
       "Gain a barrier and bonus move speed.",
       "Curses a hero, who is rooted unless they get away in time.",
       "Charge up, then pulse damage around you and heal from it."],
  t: [2,2,2,2,3.5,0,2.5,2,1.5,2.5,4,0,1,0,2.5,0.5,3,0,0,0,1,0,1.5],
  vibe: ["noir"], feel: {heavy:1}, gim: {undying:0.6}
},
wraith: {
  pitch: "A telekinetic duelist. Shoot to summon cards, teleport with Project Mind, boost your fire rate with Full Auto, and lift a victim out of the fight with Telekinesis.",
  ab: ["Weapon damage summons cards you throw at enemies for random effects.",
       "Teleport to a target location.",
       "Boost your fire rate and add spirit damage to your shots.",
       "Lift an enemy hero, then slam them toward a target location."],
  t: [1,1.5,2.5,3,1,0,2.5,2,2,4,2,0.5,0,0.5,3.5,0,1,0,1,0,0,0,2],
  vibe: ["showbiz","noir"], feel: {hose:1}, gim: {teleport:0.8, grab:0.5}
},
yamato: {
  pitch: "A sword-wielding pursuer. Grapple to enemies, cut them with a charged Power Slash, and transform into her shadow form for an invincible window of refreshed abilities.",
  ab: ["Charge a sword strike for heavy damage at full charge.",
       "Grapple to an enemy and strike them, slowing on arrival.",
       "Slash in front of you, slowing fire rate and healing on hero hits.",
       "An invincible transformation that refreshes abilities and grants debuff immunity."],
  t: [3,3,1,3.5,1.5,0,1.5,4,2.5,3,3.5,0,0,0,3,3,2.5,1.5,0,0,0,0,1],
  vibe: ["occult"], feel: {shotgun:1}, gim: {transform:1, undying:0.7, timing:0.8, grab:0.4}
},
ratking: {
  pitch: "The rightful King of the Rats, leading the charge up from the sewers. Scrap Grenade and Rat Swarm soften enemies up for his spreadshot, Royal Pestments let him wade through gunfire, and the banner of Ratannia rallies the whole team.",
  ab: ["A scrap grenade that detonates several times, damaging and slowing enemies.",
       "Rats leap onto enemies, biting for spirit damage and shredding bullet resist.",
       "Armor that adds a barrier based on your max health and can deflect bullets back.",
       "Plant the royal banner: nearby allies gain speed, slow immunity and damage reduction."],
  t: [3,1.5,1.5,2,3.5,1.5,2,1.5,1.5,1.5,3.5,0.5,1.5,0.5,2,1,1.5,1,1,1.5,2,0,2],
  vibe: ["beast","storybook"], feel: {hose:0.8, shotgun:0.6}, gim: {summon:0.5, undying:0.4, stealth:0.3}
},
baba: {
  pitch: "Central Park's pigeon lady, and a hexing witch on a walking bench. Threadsap steals spirit to power up her bullets, Granny Long Legs lets her kick and stomp on the frontline, and Feed The Birds turns a whole group into pigeons.",
  ab: ["A thread that follows your crosshair and bursts, stealing spirit that empowers your bullets.",
       "Your bench sprouts legs: speed, high jumps, knockback kicks and a ground pound.",
       "Thrown tea that cycles between an ally barrier, a silence and a scalding burn.",
       "Cover enemies in bread to slow them, then a flock of pigeons hexes them into birds."],
  t: [1,3.5,1.5,2.5,2.5,1.5,3.5,2.5,1.5,1.5,3,0,1.5,0.5,2.5,3,2,1.5,0,1,1.5,0,1.5],
  vibe: ["occult","storybook"], feel: {shotgun:0.7, heavy:0.4}, gim: {steal:1, transform:0.4, timing:0.4, summon:0.3}
},
solomon: {
  pitch: "A calm chess master who treats every fight like a board. Slide bishops through enemies, pin them down with Rook Battery, guard an ally with Kingside Knight and finish with a stunning Develop Queen.",
  ab: ["Place a bishop and slide it through enemies to slow them; its diagonal squares deal damage.",
       "Give an ally a barrier and stamina, then move them while invulnerable; self-cast for double barrier.",
       "Twin rooks rush forward, immobilizing enemies and rebounding off walls.",
       "The queen crashes down, then stuns along straight lines; move her to strike again."],
  t: [1,3,3,2,2,2.5,3.5,2,2,1.5,1.5,0,3.5,2,2.5,0,0.5,1.5,0.5,2,0.5,2,2],
  vibe: ["noir","occult"], feel: {heavy:1}, gim: {trap:0.9, summon:0.7, teleport:0.4}
},
danny: {
  pitch: "A reckless Fairfax salesman with a rocket launcher and a permanently attached jetpack. Mark enemies with Strix Salvo, dive-bomb them with Chimera Mk1 and Close The Deal by carrying a victim into the sky.",
  ab: ["Missiles lodge in the ground and explode near enemies, marking them for charged shots.",
       "Jetpack flight that overheats into an explosive dive onto the enemies below.",
       "Spray fuel that shreds bullet resist, building to a backblast that knocks you backwards.",
       "Grab an enemy, rocket into the sky and crash back down together."],
  t: [2,2.5,2,3.5,1.5,0,2,3.5,2.5,3,3.5,0,1.5,0,2.5,0,0.5,4,1,0.5,1,2,2],
  vibe: ["machine","showbiz"], feel: {heavy:0.8, burst:0.6}, gim: {flight:1, grab:0.8, trap:0.5}
},
violet: {
  pitch: "A nimble young artist who paints the fight her way. Steer empowered bullets or draw walls with Living Ink, glide around on Flow State, capture a subject in a Still Life and punish anyone who leaves her Abstract Landscape.",
  ab: ["Steer three empowered bullets that cut your cooldowns on hit, or draw a wall of ink.",
       "A brush trail that slows enemies and boosts your team's slides; flick it for a bigger hit.",
       "Sketch a hero while looking at them to stun them; collect the sketch for permanent stats.",
       "A vision-blocking ink dome that powers up allies; enemies who leave are silenced and slowed."],
  t: [1,3,3,3,1,2,3,2.5,3,2.5,2,1,3,0,3,0,1,0.5,0.5,1.5,1,0,2],
  vibe: ["storybook","showbiz"], feel: {heavy:1, precision:0.4}, gim: {trap:0.9, steal:0.7}
},
harrow: {
  pitch: "A severe nurse from the Marble Hill Possession Ward. Heal allies with her syringe gun, drain enemies with leeches that make her stronger, push a patient into a Wretched Vapors rush and send foes fleeing with Lurking Terrors.",
  ab: ["Leeches drain enemy health and buffs, then crawl back to grant you lasting regen and fire rate.",
       "Speed up yourself or an ally and delay incoming damage, followed by a slower crash.",
       "Load a clip of syringes that heal the allies you shoot.",
       "Enemies who look at you lose stamina and movement abilities, then flee in fear."],
  t: [1,2,3,2,1.5,4,3,1,2.5,1,1,0,1.5,0.5,3,0,2,0,0.5,3.5,3,0,1.5],
  vibe: ["occult","machine"], feel: {heavy:0.8, precision:0.5}, gim: {steal:0.8, undying:0.6}
}
};
if (typeof module !== "undefined") module.exports = EDIT;
