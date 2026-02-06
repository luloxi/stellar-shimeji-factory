"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getAddress,
  getNetwork,
  getNetworkDetails,
  isConnected,
  requestAccess,
} from "@stellar/freighter-api";

type FreighterState = {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  publicKey: string | null;
  network: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
};

const FreighterContext = createContext<FreighterState | null>(null);

function hasError<T extends { error?: unknown }>(value: T): value is T & {
  error: { message?: string } | string;
} {
  return Boolean(value && "error" in value && value.error);
}

function hasWindowFreighter() {
  if (typeof window === "undefined") return false;
  const anyWindow = window as unknown as {
    freighterApi?: unknown;
    freighter?: unknown;
  };
  return Boolean(anyWindow.freighterApi || anyWindow.freighter);
}

async function getNetworkLabel(): Promise<string | null> {
  const details = await getNetworkDetails();
  if (hasError(details)) {
    const networkObj = await getNetwork();
    if (hasError(networkObj)) {
      return null;
    }
    return networkObj.network || null;
  }
  return details.network || details.networkPassphrase || null;
}

export function FreighterProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const windowAvailable = hasWindowFreighter();
      setIsAvailable(windowAvailable);

      const status = await isConnected();
      if (hasError(status)) {
        setIsConnected(false);
        setPublicKey(null);
        setNetwork(null);
        return;
      }
      setIsAvailable(true);
      if (!status.isConnected) {
        setIsConnected(false);
        setPublicKey(null);
        setNetwork(null);
        return;
      }

      const addressObj = await getAddress();
      if (hasError(addressObj)) {
        setIsConnected(false);
        setPublicKey(null);
        setNetwork(null);
        return;
      }

      const nextNetwork = await getNetworkLabel();
      setIsConnected(Boolean(addressObj.address));
      setPublicKey(addressObj.address || null);
      setNetwork(nextNetwork);
      setError(null);
    } catch (err) {
      console.error("Freighter refresh error:", err);
      setError("Unable to read Freighter connection.");
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const windowAvailable = hasWindowFreighter();
      const status = await isConnected();
      if (!windowAvailable && (hasError(status) || !status.isConnected)) {
        setIsAvailable(false);
        setError("Freighter wallet not detected.");
        return;
      }
      setIsAvailable(true);

      const access = await requestAccess();
      if (hasError(access)) {
        throw new Error(
          typeof access.error === "string"
            ? access.error
            : access.error.message || "Connection request failed."
        );
      }

      const nextNetwork = await getNetworkLabel();
      setIsConnected(true);
      setPublicKey(access.address);
      setNetwork(nextNetwork);
      setError(null);
    } catch (err) {
      console.error("Freighter connect error:", err);
      setError("Connection request was rejected or failed.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setPublicKey(null);
    setNetwork(null);
    setError(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      isAvailable,
      isConnected,
      isConnecting,
      publicKey,
      network,
      error,
      connect,
      disconnect,
      refresh,
    }),
    [
      isAvailable,
      isConnected,
      isConnecting,
      publicKey,
      network,
      error,
      connect,
      disconnect,
      refresh,
    ]
  );

  return (
    <FreighterContext.Provider value={value}>
      {children}
    </FreighterContext.Provider>
  );
}

export function useFreighter() {
  const context = useContext(FreighterContext);
  if (!context) {
    throw new Error("useFreighter must be used within FreighterProvider");
  }
  return context;
}
