"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface BrandContextValue {
  selectedBrandId: string;
  setSelectedBrandId: (id: string) => void;
}

const BrandContext = createContext<BrandContextValue>({
  selectedBrandId: "",
  setSelectedBrandId: () => {},
});

export function BrandProvider({
  defaultBrandId,
  children,
}: {
  defaultBrandId: string;
  children: ReactNode;
}) {
  const [selectedBrandId, setSelectedBrandIdState] = useState(defaultBrandId);

  useEffect(() => {
    const stored = localStorage.getItem("selectedBrandId");
    if (stored) setSelectedBrandIdState(stored);
  }, []);

  const setSelectedBrandId = useCallback((id: string) => {
    setSelectedBrandIdState(id);
    localStorage.setItem("selectedBrandId", id);
  }, []);

  const value = useMemo(
    () => ({ selectedBrandId, setSelectedBrandId }),
    [selectedBrandId, setSelectedBrandId],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useSelectedBrand() {
  return useContext(BrandContext);
}
