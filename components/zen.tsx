"use client";

import { createContext, useContext } from "react";

/** True when Zen mode is on (icons-only header, no tooltips). */
export const ZenContext = createContext(false);

export const useZen = () => useContext(ZenContext);
