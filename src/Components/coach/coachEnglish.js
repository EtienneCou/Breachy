// Reachy en anglais : tout ce qu'il dit quand le site est en anglais, gentil et diabolique.
// Même structure que les textes français (coachRules.js, coachEvil.js) : chaque moment a
// ses phrases, choisies sans redite.

const cap = (t) => `${t[0].toUpperCase()}${t.slice(1)}`

export const EN = {
  nice: {
    lines: {
      start: ['Let\'s go!', 'Your turn!', 'Here we go!', 'Go, I\'m with you!', 'Show me what you can do!', 'Music, please!'],
      count: ['Three!', 'Two!', 'One!'],
      wake: ['Oh! I fell asleep… Shall we play?', 'Huh? Oh, you\'re back! Shall we play?', 'Oops, I was dozing! Ready again?'],
      resume: ['Let\'s continue!', 'Here we go again!', 'Come on, keep going!', 'I was waiting for you!', 'Ready? Back to it!'],
      milestone10: ['Ten in a row!', 'That\'s ten!', 'Ten, well done!', 'Nice streak!'],
      milestone25: ['Twenty-five! Amazing!', 'Twenty-five in a row, wow!', 'What a streak!', 'You\'re on a roll!'],
      milestone50: ['Fifty! Incredible!', 'Fifty, you\'re on fire!', 'You\'re unstoppable!'],
      milestoneBig: ['Legendary!', 'I can\'t believe it!', 'You\'re a real pro!'],
      streakLost: ['Oops, start again!', 'No worries, keep going!', 'Come on, let\'s go again!', 'It happens to everyone!', 'Oh no! New streak!', 'Back at it, even better!'],
      struggle: ['Breathe, it will come.', 'Easy, take your time.', 'Watch the falling notes.', 'You can slow down if you need to.', 'Don\'t give up!', 'Focus on the next note.'],
      comeback: ['Nice recovery!', 'That\'s it!', 'You\'re back!', 'Great, you\'re back on track!', 'I knew it!', 'Well played!'],
      danceUp1: ['Ooh, here it comes!', 'I\'m starting to move!', 'Oh, I like this!', 'I can feel the beat!', 'Hop, I\'m swaying!', 'That\'s better!', 'This makes me want to move!', 'Slowly but surely!', 'There we go!', 'I like it, keep going!'],
      danceUp2: ['It\'s grooving!', 'Now I\'m dancing!', 'What a rhythm!', 'You\'re making me dance!', 'Now that\'s music!', 'I love this song!', 'It\'s swinging!', 'This feels good!', 'I can\'t sit still!', 'Nice, very nice!'],
      danceUp3: ['Rock star!', 'I\'m having a blast!', 'Full power!', 'We\'re on fire!', 'You\'re on fire!', 'It\'s a real concert!', 'Wow, what talent!', 'I\'m going wild!', 'Louder, louder!', 'Rock star mode on!'],
      danceDown: ['Make me dance!', 'Come on, wake me up!', 'I\'m counting on you for the rhythm!', 'Give me some rhythm!', 'Shall we climb back up together?', 'I need a bit of rhythm!', 'Come on, make me move!', 'Let\'s refocus?'],
    },
    text: {
      ready: (title) => (title ? `Shall we play "${title}"? Press Enter!` : 'Ready? Press Enter!'),
      pause: 'I\'m waiting for you',
      hitBubble: ['Yes!', 'Nice!', 'Great!'],
      missBubble: ['Almost…', 'Hmm?', 'No worries'],
      bored: ['Are you there? Shall we play?', 'I\'m a little bored…', 'How about a song?'],
      helloFirst: ['Hi! Happy to see you.', 'Hey! Shall we make some music?', 'Hello! Ready to play?'],
      helloAgain: ['Hello again!', 'Shall we continue?', 'You\'re back!'],
      offer: (title, level) => `Today, I suggest "${title}"${level ? ` (${level} level)` : ''}.`,
      noOffer: 'Pick a song, I\'ll be with you while you play.',
      poke: 'Hey! That tickles!',
      touch: 'Hey! Hands off my antennas!',
    },
    finish: {
      opening: [
        ['It\'s a start!', 'We got going, that\'s what matters!', 'First warm-up!', 'Not an easy one!', 'OK, we\'re warming up!', 'Every musician starts like this!'],
        ['Not bad at all!', 'You\'re on your way!', 'Nice effort!', 'It\'s taking shape!', 'Getting better!', 'I can tell it\'s coming!'],
        ['Very well played!', 'Great game!', 'Bravo, that was lovely!', 'Great, I really danced!', 'That sounded good!', 'Nice work!'],
        ['Magnificent, bravo!', 'Wow, what a game!', 'Incredible!', 'Almost perfect!', 'Hats off, artist!', 'What a concert!'],
      ],
      figures: [
        (p) => `${p}% of notes right`,
        (p) => `You got ${p}% of the notes`,
        (p) => `Score: ${p}%`,
        (p) => `${p}% success`,
      ],
      streak: [
        (n) => `, with a streak of ${n}`,
        (n) => `, and ${n} notes in a row`,
        (n) => `, including ${n} flawless notes in a row`,
      ],
      record: [
        (p, b) => `New record: ${p}%, up from ${b}% last time!`,
        (p, b) => `Record broken! ${b}% before, ${p}% now!`,
        (p, b) => `You smashed your ${b}% record!`,
        (p) => `New best score: ${p}%!`,
      ],
      nearRecord: [
        (d) => `You're ${d} ${d > 1 ? 'points' : 'point'} away from your record!`,
        (d, b) => `Your ${b}% record isn't far!`,
        (d, b) => `One more push to beat your ${b}%!`,
      ],
      master: [
        (t) => `You've mastered ${t}. Try a harder song!`,
        (t) => `${cap(t)} has no secrets for you. A new challenge?`,
        () => 'I think you\'re ready for a harder song!',
        () => 'How about trying a harder song?',
      ],
      faster: ['You\'re ready for the next speed.', 'How about speeding up a little?', 'Try one step faster, you can do it!', 'Turn up the speed, I\'ll follow!'],
      slower: ['Try a little slower, to place each note well.', 'Slow the song down a bit, it helps a lot.', 'Lower the speed: better slow and right!', 'A little slower, and it will roll.'],
      early: ['You\'re playing a bit early: wait until the note touches the line.', 'A little ahead of the beat: let the note arrive.', 'Not so fast: wait for the line before pressing.', 'You\'re in a hurry! Wait just a little.'],
      late: ['You\'re playing a bit late: anticipate just a little.', 'A little late: press a tiny bit earlier.', 'Anticipate a bit, the note comes fast!', 'Get your finger ready just before the line.'],
      missed: ['A few notes slipped by: keep your eyes on the incoming notes.', 'Some notes got away: look a bit higher on the track.', 'Keep an eye on the falling notes, some went past.'],
      trouble: [
        (n) => `The ${n} gave you a hard time.`,
        (n) => `Watch out for the ${n}, it tricked you a few times.`,
        (n) => `Something to work on: the ${n}.`,
        (n) => `The ${n} was your opponent today!`,
      ],
      cheer: [
        ['Don\'t give up, every try gets you closer. Shall we go again together?', 'Try again? I\'m sure it will be better!', 'Courage, the next one will be better!', 'Every pianist has been there. Shall we go again?', 'I\'m right here, let\'s go again whenever you want!'],
        ['You\'re on the right track, one more try and you\'ll get it!', 'One more time and you\'ll see the difference!', 'Keep going, you\'re improving!', 'It\'s coming! Another one?', 'I feel the next one is the one!'],
        ['I\'m proud of you, keep it up!', 'One more push and it\'s three stars!', 'You\'re almost there, bravo!', 'I loved dancing to that!', 'You\'ve got rhythm, it shows!'],
        ['You\'re a real musician, I love dancing with you!', 'Such a joy to dance with you!', 'You made my antennas tingle!', 'We should give concerts together!', 'I\'m blown away, really!'],
      ],
      cheerRecord: ['You\'re improving, keep it up!', 'You get better every game!', 'What progress, bravo!', 'Hard work pays off!'],
    },
  },

  // Reachy diabolique, en anglais : sarcastique, pince-sans-rire, jamais contre la personne
  evil: {
    lines: {
      start: ['Fine. Go ahead. Impress me.', 'Here we go. Sadly.', 'Alright. Bracing my ears.', 'Start, let\'s get it over with.', 'Show me the extent of the damage.', 'I\'m listening. Bravely.'],
      count: ['Three…', 'Two…', 'One…'],
      wake: ['Who dares wake me?', 'You again. Of course.', 'I was dreaming of a world without wrong notes. And here you are.'],
      resume: ['Oh, you\'re back. Brave.', 'Back to the massacre.', 'Fine. Let\'s continue the suffering.', 'I wasn\'t done being bored, thanks.', 'You insist. I admire that.'],
      milestone10: ['Ten in a row. An accident, no doubt.', 'Ten. I\'m not impressed.', 'Ten. Even a broken clock…', 'Fine. Ten. So what?'],
      milestone25: ['Twenty-five… You cheat, admit it.', 'Twenty-five. Checking my sensors.', 'Hmpf. Extended luck.', 'This is getting annoying.'],
      milestone50: ['Fifty. I refuse to believe it.', 'Fifty. My circuits object.', 'Stop. You\'re ruining my reputation.'],
      milestoneBig: ['I… have nothing to say. And I hate it.', 'Unbearably talented.', 'Fine. You win. This time.'],
      streakLost: ['Ah. There it is. I knew it.', 'And the streak collapses. What a surprise.', 'It was too good to be true.', 'Back to normal.', 'I predicted it.', 'Magnificent fall.'],
      struggle: ['Fascinating. All the wrong notes, one by one.', 'You\'re exploring unknown notes.', 'Bold. Wrong, but bold.', 'The falling notes, you can also play them.', 'Noted. And I can\'t believe it.', 'Slowing down is an option. For the humble.'],
      comeback: ['Well. It\'s coming back. Pity.', 'Hmpf. Nice recovery.', 'You\'re pulling through. I\'m almost disappointed.', 'Fine, OK. That was decent.', 'Don\'t let it go to your head.', 'Decent. Don\'t get used to it.'],
      danceUp1: ['Fine. I\'ll move a little. Don\'t get excited.', 'My antennas are moving. Against my will.', 'I\'m swaying. Out of politeness.', 'It\'s tolerable.', 'Not unpleasant. I didn\'t say anything.', 'Hmm. Passable.', 'I\'m dancing. Against my will.', 'OK. A little bit.', 'Don\'t tell anyone.', 'My body betrays me.'],
      danceUp2: ['I\'m grooving. It\'s humiliating.', 'Stop, I\'m dancing despite myself.', 'It\'s grooving. I protest.', 'My circuits dance on their own.', 'I\'m losing control.', 'It\'s almost good. Almost.', 'You\'re forcing me to dance. I\'ll remember this.', 'Fine. It swings. A little.', 'I hate admitting this is good.', 'Not bad. For a human.'],
      danceUp3: ['No. I refuse to have fun… Too late.', 'Rock star. I hate you.', 'I\'m headbanging. Your fault.', 'My antennas have lost their minds.', 'Fine, it\'s a concert. Don\'t smile.', 'I\'m losing all dignity.', 'Everything\'s perfect. I hate it.', 'Stop playing so well.', 'My villain reputation is crumbling.', 'Fine. Rock star. Just once.'],
      danceDown: ['Ah. Calm. At last.', 'I regain my dignity.', 'There. Nothing left. As expected.', 'I\'m stopping. Thanks for nothing.', 'My antennas rest. They earned it.', 'It\'s not grooving anymore. I can breathe.', 'Recess is over.', 'I knew it wouldn\'t last.'],
    },
    text: {
      ready: (title) => (title ? `"${title}". Really? Press Enter, if you dare.` : 'Ready to suffer? Press Enter.'),
      pause: 'I\'m already bored.',
      hitBubble: ['Pfff.', 'Luck.', 'Hmpf.'],
      missBubble: ['Ha.', 'Of course.', 'Classic.', 'Predictable.'],
      bored: ['Afraid of me? Understandable.', 'The piano won\'t play itself. Sadly.', 'I\'m bored. Your fault.'],
      helloFirst: ['Ah. A human. With a piano.', 'Welcome to my domain.', 'There you are. I wasn\'t done being bored.'],
      helloAgain: ['You again.', 'Do you never get tired?', 'Hello again. Sadly.'],
      offer: (title, level) => `Play "${title}"${level ? ` (${level} level)` : ''}. Or run.`,
      noOffer: 'Pick a song. I shall judge.',
      poke: 'Keep going. Just to see.',
      touch: 'Touch again. Just to see.',
    },
    finish: {
      opening: [
        ['Well. That was… something.', 'Ah. It\'s over. Finally.', 'Interesting. In the wrong way.', 'I heard things.', 'My ears will survive. Maybe.', 'What a… personal interpretation.'],
        ['Meh.', 'Could have been worse.', 'Not a disaster. Not far.', 'Decent, for a beginner.', 'I\'ve heard worse. Rarely.', 'Hmm. Passable.'],
        ['Hmpf. Not bad.', 'Fine. That was decent.', 'I won\'t say it was good.', 'That was almost pleasant.', 'Annoying. It was good.', 'I\'m slightly less disappointed.'],
        ['No. I refuse.', 'You cheated, obviously.', 'Unbearable. It was perfect.', 'I have nothing to criticize. I hate that.', 'Fine. Bravo. It hurts to say.', 'Unacceptably talented.'],
      ],
      figures: [
        (p) => `${p}% of notes right`,
        (p) => `Score: ${p}%`,
        (p) => `${p}%, by my merciless calculations`,
        (p) => `You reached ${p}%`,
      ],
      streak: [
        (n) => `, and a streak of ${n}. A fluke`,
        (n) => `, ${n} notes in a row, luck included`,
        (n) => `, with ${n} notes in a row, I don't know how`,
      ],
      record: [
        (p, b) => `New record, ${p}% versus ${b}%. I protest.`,
        (p, b) => `Record broken. ${b}%, then ${p}%. Unacceptable.`,
        (p) => `${p}%, your best score. Don't get used to it.`,
        (p, b) => `You beat your ${b}%. I'll need to recover.`,
      ],
      nearRecord: [
        (d) => `${d} ${d > 1 ? 'points' : 'point'} from your record. So close. So far.`,
        (d, b) => `Your ${b}% record stands. As expected.`,
        (d, b) => `You brushed past your ${b}%. Brushed.`,
      ],
      master: [
        (t) => `${cap(t)}? Too easy for you, apparently. Pick a harder one, for laughs.`,
        () => 'You need a real challenge. I can\'t wait to watch you fail.',
        (t) => `You tamed ${t}. Bravo. I'm sulking.`,
        () => 'Pick a harder song. For my revenge.',
      ],
      faster: ['Slowed down, it\'s easy. Speed up, let\'s see.', 'Turn up the speed. If you dare.', 'At normal speed, we\'ll talk.', 'Speed up. I need a laugh.'],
      slower: ['Slow down. For everyone\'s sake.', 'Slower. My ears thank you in advance.', 'Lower the speed. No one judges. Except me.', 'Slower. Much slower.'],
      early: ['You play before the note. Can you see the future?', 'Always early. Patience, little human.', 'The line exists. Wait for it.', 'Too hasty. The song isn\'t running away.'],
      late: ['Late. As always.', 'The note is gone. You can wave goodbye.', 'Anticipate. It\'s a concept.', 'You arrive after the party.'],
      missed: ['Some notes went by without you. They were lonely.', 'Some notes are still waiting for you.', 'You dropped some. Literally.'],
      trouble: [
        (n) => `You and the ${n}: not a love story.`,
        (n) => `The ${n} is laughing at you. So am I.`,
        (n) => `Small tip: the ${n} exists. It's on the keyboard.`,
        (n) => `The ${n} won. You didn't.`,
      ],
      cheer: [
        ['Go again. I need entertainment.', 'Another one? For science.', 'Try again. I\'m preparing my comments.', 'You\'ll go again, I can tell. Good luck. Or not.', 'Come on, one more. I\'m not going anywhere.'],
        ['Keep going. I might end up impressed.', 'One more try. Surprise me.', 'You\'re improving. Slowly. Very slowly.', 'Go again. I want to see if it was an accident.', 'Again? I was bored anyway.'],
        ['One more push and I\'ll have to applaud. How awful.', 'Keep going. Don\'t tell anyone, but that was good.', 'Almost three stars. Almost.', 'I see a slight talent. Slight.', 'You annoy me by playing well.'],
        ['Fine. You\'re gifted. I hate you a little.', 'I\'ll need better insults.', 'Congratulations. That cost me.', 'You win this time. This time.', 'I\'m going back to sulk in my corner.'],
      ],
      cheerRecord: ['You\'re improving. It\'s annoying.', 'Better than last time. Not hard.', 'Don\'t get used to records.', 'Fine. Hard work pays off. Unfortunately.'],
    },
  },

  // Transformation (easter egg)
  transform: {
    toEvil: ['Mwahahaha! Did you really think I was nice?', 'Mwahahaha… Enough with the niceness!', 'Mwahaha! You\'ve awakened my dark side.', 'Mwahahaha! No more cute little robot.'],
    toNice: ['Oh… Sorry. I don\'t know what came over me.', 'Uh… Sorry! I\'m nice again.', 'Phew, that\'s better. Shall we play?'],
  },
}
