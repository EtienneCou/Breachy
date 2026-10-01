import {
  useEffect,
  useState,
} from "react";

import {
  correctReaction,
  wrongReaction,
  successReaction,
  neutral,
} from "../Services/reachyService";

const REACHY_API =
  "http://localhost:8000/api";

export default function useReachy() {
  const [connected, setConnected] =
    useState(false);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        const response =
          await fetch(
            `${REACHY_API}/state/full`
          );

        if (!response.ok) {
          throw new Error(
            `Reachy API ${response.status}`
          );
        }

        setConnected(true);
        setError(null);
      } catch (err) {
        setConnected(false);
        setError(err);
      }
    }

    checkConnection();
  }, []);

  return {
    connected,
    error,
    correct: correctReaction,
    wrong: wrongReaction,
    success: successReaction,
    neutral,
  };
}