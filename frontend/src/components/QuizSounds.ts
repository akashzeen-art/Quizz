const RIGHT = ['/SOUND/right-1.mp3', '/SOUND/right-2.mp3', '/SOUND/right-3.mp3', '/SOUND/right-4.mp3', '/SOUND/right-5.mp3']
const WRONG = ['/SOUND/wrong-1.mp3', '/SOUND/wrong-2.mp3', '/SOUND/wrong-3.mp3', '/SOUND/wrong-4.mp3']

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function play(src: string) {
  try {
    const a = new Audio(src)
    a.volume = 0.6
    void a.play()
  } catch { /* ignore */ }
}

export const QuizSounds = {
  correct: () => play(pick(RIGHT)),
  wrong:   () => play(pick(WRONG)),
}
