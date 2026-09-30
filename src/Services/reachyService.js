const REACHY_API = "http://localhost:8000/api";

async function sendMove({
  antennas = [0, 0],
  body_yaw = 0,
  duration = 0.5,
  pitch = 0,
  roll = 0,
  yaw = 0,
  x = 0,
  y = 0,
  z = 0,
  interpolation = "minjerk",
} = {}) {
  const response = await fetch(
    `${REACHY_API}/move/goto`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        antennas,
        body_yaw,
        duration,

        head_pose: {
          pitch,
          roll,
          yaw,
          x,
          y,
          z,
        },

        interpolation,
      }),
    }
  );

  if (!response.ok) {
    const message =
      await response.text();

    throw new Error(
      `Erreur Reachy ${response.status}: ${message}`
    );
  }

  return response.json();
}

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

export async function neutral() {
  return sendMove({
    antennas: [0, 0],
    pitch: 0,
    roll: 0,
    yaw: 0,
    duration: 0.4,
  });
}

export async function correctReaction() {
  // Petit hochement positif
  await sendMove({
    antennas: [8, 8],
    pitch: -5,
    duration: 0.18,
  });

  await sleep(180);

  await sendMove({
    antennas: [12, 12],
    pitch: 3,
    duration: 0.18,
  });

  await sleep(180);

  await neutral();
}

export async function wrongReaction() {
  await sendMove({
    antennas: [-5, 5],
    roll: 4,
    yaw: -5,
    duration: 0.25,
  });

  await sleep(300);

  await neutral();
}

export async function successReaction() {
  await sendMove({
    antennas: [18, 18],
    pitch: -6,
    duration: 0.2,
  });

  await sleep(220);

  await sendMove({
    antennas: [-15, 15],
    roll: 5,
    yaw: 6,
    duration: 0.25,
  });

  await sleep(250);

  await sendMove({
    antennas: [15, -15],
    roll: -5,
    yaw: -6,
    duration: 0.25,
  });

  await sleep(250);

  await sendMove({
    antennas: [20, 20],
    pitch: -8,
    duration: 0.2,
  });

  await sleep(220);

  await neutral();
}