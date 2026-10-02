// Client du robot Reachy Mini, par l'API HTTP de son serveur local (le « daemon »).
// Même code pour la simulation (`reachy-mini-daemon --sim`) et le Reachy Mini Lite
// branché en USB : le daemon écoute sur http://localhost:8000 et accepte les appels
// des pages servies depuis localhost (l'appli en développement).
// Documentation des routes : http://localhost:8000/docs quand le daemon tourne.

export const DEFAULT_REACHY_URL = 'http://localhost:8000'

// Bibliothèques de mouvements enregistrés (mouvement + son), préchargées par le daemon.
export const EMOTIONS = 'pollen-robotics/reachy-mini-emotions-library'
export const DANCES = 'pollen-robotics/reachy-mini-dances-library'

const STATUS_TIMEOUT_MS = 1500
const deg = (d) => (d * Math.PI) / 180

export function createReachyClient(baseUrl = DEFAULT_REACHY_URL) {
  const api = (path) => `${baseUrl.replace(/\/$/, '')}/api${path}`

  async function request(path, { method = 'POST', body, timeout } = {}) {
    const controller = new AbortController()
    const timer = timeout ? setTimeout(() => controller.abort(), timeout) : null
    try {
      const response = await fetch(api(path), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Reachy : ${method} ${path} → ${response.status}`)
      return response.headers.get('content-type')?.includes('json') ? response.json() : null
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    baseUrl,

    /** État du daemon (null s'il ne répond pas : pas lancé, ou mauvaise adresse). */
    async status() {
      try {
        return await request('/daemon/status', { method: 'GET', timeout: STATUS_TIMEOUT_MS })
      } catch {
        return null
      }
    },

    /** Le robot se réveille (relève la tête) ou se rendort. */
    wakeUp: () => request('/move/play/wake_up'),
    goToSleep: () => request('/move/play/goto_sleep'),

    // Les mouvements renvoient { uuid } : de quoi les arrêter avec stop(uuid).

    /** Joue une émotion de la bibliothèque officielle (ex. 'success1', 'oops1'). */
    playEmotion: (name) => request(`/move/play/recorded-move-dataset/${EMOTIONS}/${name}`),

    /** Joue une petite danse de la bibliothèque officielle (ex. 'yeah_nod'). */
    playDance: (name) => request(`/move/play/recorded-move-dataset/${DANCES}/${name}`),

    /**
     * Mouvement court et fluide vers une position, en degrés :
     * head { roll, pitch, yaw } (pitch positif = tête vers le bas), avec en option x, y, z
     * (décalage de la tête, en mm), antennas [droite, gauche], body (rotation du corps).
     * Les parties non précisées ne bougent pas.
     */
    goto({ head, antennas, body, duration = 0.4 }) {
      const mm = (v) => (v ?? 0) / 1000
      return request('/move/goto', {
        body: {
          head_pose: head ? { x: mm(head.x), y: mm(head.y), z: mm(head.z), roll: deg(head.roll ?? 0), pitch: deg(head.pitch ?? 0), yaw: deg(head.yaw ?? 0) } : undefined,
          antennas: antennas ? antennas.map(deg) : undefined,
          body_yaw: body != null ? deg(body) : undefined,
          duration,
        },
      })
    },

    // ---------- Haut-parleur du robot ----------

    /** Son disponible sur le robot ? (la simulation n'a pas de haut-parleur) */
    async mediaAvailable() {
      try {
        const status = await request('/media/status', { method: 'GET', timeout: STATUS_TIMEOUT_MS })
        return Boolean(status?.available)
      } catch {
        return false
      }
    },

    /** Envoie un fichier son au robot (`name` : nom du fichier chez lui, ex. 'phrase.wav'). */
    async uploadSound(blob, name) {
      const form = new FormData()
      form.append('file', blob, name)
      const response = await fetch(api('/media/sounds/upload'), { method: 'POST', body: form })
      if (!response.ok) throw new Error(`Reachy : envoi du son → ${response.status}`)
    },

    /** Joue sur son haut-parleur un son déjà envoyé, et le coupe. */
    playSound: (name) => request('/media/play_sound', { body: { file: name } }),
    stopSound: () => request('/media/stop_sound'),

    /** La tête bouge doucement au rythme de ce qu'il dit (ajouté à ses mouvements). */
    setWobbling: (on) => request(`/media/wobbling/${on ? 'enable' : 'disable'}`),

    // ---------- Caméra ----------

    /**
     * Il suit du regard le visage qu'il voit. `weight` (0 à 1) : part du regard mélangée
     * à ses mouvements (0 = suivi en pause) ; null : suivi arrêté.
     */
    setTracking: (weight) =>
      weight == null ? request('/media/tracking/disable') : request('/media/tracking/enable', { body: { weight } }),

    /** Mouvements en cours (liste d'identifiants). */
    running: () => request('/move/running', { method: 'GET' }),

    /** Arrête un mouvement en cours (`uuid` renvoyé par playEmotion, playDance, goto…). */
    stop: (uuid) => request('/move/stop', { body: { uuid } }),

    /**
     * Arrête tous les mouvements en cours. Le daemon les joue en parallèle : un nouveau
     * mouvement lancé avant la fin d'un autre se dispute la tête avec lui (à-coups).
     */
    async stopAll() {
      const moves = (await request('/move/running', { method: 'GET' })) ?? []
      await Promise.all(moves.map(({ uuid }) => request('/move/stop', { body: { uuid } }).catch(() => {})))
    },

    /**
     * Flux continu de positions (WebSocket /api/move/ws/set_target), pour la danse :
     * la doc demande une seule boucle qui envoie les positions à 50 Hz environ.
     * Retourne { send({ head, antennas, body }) en degrés, close(), isOpen() }.
     * Pendant une émotion ou un goto, le daemon ignore ces positions.
     */
    openTargetStream() {
      const url = api('/move/ws/set_target').replace(/^http/, 'ws')
      const socket = new WebSocket(url)
      return {
        isOpen: () => socket.readyState === WebSocket.OPEN,
        send({ head, antennas, body }) {
          if (socket.readyState !== WebSocket.OPEN) return
          socket.send(
            JSON.stringify({
              target_head_pose: { x: 0, y: 0, z: 0, roll: deg(head.roll), pitch: deg(head.pitch), yaw: deg(head.yaw) },
              target_antennas: antennas.map(deg),
              target_body_yaw: deg(body),
            }),
          )
        },
        close: () => socket.close(),
      }
    },
  }
}
