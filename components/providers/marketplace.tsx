"use client";

import React, {
  useEffect,
  useState,
  ReactNode,
  createContext,
  useContext,
} from "react";
import {
  ApplicationContext,
  ClientSDK,
} from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";
import { AI } from "@sitecore-marketplace-sdk/ai";
import { Brand } from "@/lib/sdk/brand-module";
import type { PagesContext } from "@sitecore-marketplace-sdk/client";

interface ClientSDKProviderProps {
  children: ReactNode;
}

const ClientSDKContext = createContext<ClientSDK | null>(null);
const AppContextContext = createContext<ApplicationContext | null>(null);
const PagesContextContext = createContext<PagesContext | null>(null);

export const MarketplaceProvider: React.FC<ClientSDKProviderProps> = ({
  children,
}) => {
  const [client, setClient] = useState<ClientSDK | null>(null);
  const [appContext, setAppContext] = useState<ApplicationContext | null>(null);
  const [pagesContext, setPagesContext] = useState<PagesContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (client) {
      client.query("application.context").then((res) => {
        if (res && res.data) {
          setAppContext(res.data);
          console.log("[MarketplaceProvider] appContext loaded:", res.data);
          console.log("[MarketplaceProvider] appContext.type:", res.data.type);
        }
      });
    }
  }, [client]);

  // Fetch pages context - try regardless of app type since custom apps can run in Pages too
  useEffect(() => {
    if (!client) {
      console.log("[MarketplaceProvider] Waiting for client to initialize");
      return;
    }
    
    console.log("[MarketplaceProvider] Attempting to fetch pages.context (app type:", appContext?.type, ")");
    
    // Try to fetch pages context - if it succeeds, we're in Pages editor
    client.query("pages.context").then((res) => {
      if (res && res.data) {
        setPagesContext(res.data);
        console.log("[MarketplaceProvider] Pages context available:", res.data);
        
        // Subscribe to updates since we're in Pages
        client.query("pages.context", {
          subscribe: true,
          onSuccess: (data) => {
            console.log("[MarketplaceProvider] Pages context updated:", data);
            setPagesContext(data);
          },
        });
      } else {
        console.log("[MarketplaceProvider] pages.context query returned no data - not in Pages editor");
      }
    }).catch((err) => {
      // This is expected when not running in Pages - just log at debug level
      console.log("[MarketplaceProvider] pages.context not available (expected if not in Pages):", err?.message || err);
    });
  }, [client]);

  useEffect(() => {
    const init = async () => {
      const config = {
        target: window.parent,
        // AI registers the ai.skills.* routes used by generateBrandReview.
        modules: [XMC, AI, Brand],
      };
      try {
        setLoading(true);
        const client = await ClientSDK.init(config);
        setClient(client);
      } catch (error) {
        console.error("Error initializing client SDK", error);
        setError("Error initializing client SDK");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return <div>Attempting to connect to Sitecore Marketplace...</div>;
  }

  if (error) {
    return (
      <div>
        <h1>Error initializing Marketplace SDK</h1>
        <div>{error}</div>
        <div>
          Please check if the client SDK is loaded inside Sitecore Marketplace
          parent window and you have properly set your app&apos;s extention points.
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  if (!appContext) {
    return null;
  }

  return (
    <ClientSDKContext.Provider value={client}>
      <AppContextContext.Provider value={appContext}>
        <PagesContextContext.Provider value={pagesContext}>
          {children}
        </PagesContextContext.Provider>
      </AppContextContext.Provider>
    </ClientSDKContext.Provider>
  );
};

export const useMarketplaceClient = () => {
  const context = useContext(ClientSDKContext);
  if (!context) {
    throw new Error(
      "useMarketplaceClient must be used within a ClientSDKProvider"
    );
  }
  return context;
};

export const useAppContext = () => {
  const context = useContext(AppContextContext);
  if (!context) {
    throw new Error("useAppContext must be used within a ClientSDKProvider");
  }
  return context;
};

export const usePagesContext = () => {
  return useContext(PagesContextContext);
};

/**
 * Check if the app is running in Pages editor mode
 * Returns true if pages context data is available (regardless of app type)
 */
export const useIsInPagesEditor = () => {
  const pagesContext = useContext(PagesContextContext);
  return pagesContext !== null;
};
