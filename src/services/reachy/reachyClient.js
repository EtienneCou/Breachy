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
     * head { roll, pitch, yaw } (pitch positif = tête vers le bas), antennas [droite, gauche],
     * body (rotation du corps). Les parties non précisées ne bougent pas.
     */
    goto({ head, antennas, body, duration = 0.4 }) {
      return request('/move/goto', {
        body: {
          head_pose: head ? { x: 0, y: 0, z: 0, roll: deg(head.roll ?? 0), pitch: deg(head.pitch ?? 0), yaw: deg(head.yaw ?? 0) } : undefined,
          antennas: antennas ? antennas.map(deg) : undefined,
          body_yaw: body != null ? deg(body) : undefined,
          duration,
        },
      })
    },

    /** Mouvements en cours (liste d'identifiants). */
    running: () => request('/move/running', { method: 'GET' }),

    /** Arrête un mouvement en cours (`uuid` renvoyé par playEmotion, playDance, goto…). */
    stop: (uuid) => request('/move/stop', { body: { uuid } }),

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
