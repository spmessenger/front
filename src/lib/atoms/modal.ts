import React from "react";
import { atom } from "jotai";

export const modalOpenAtom = atom<boolean>(false);
export const modalContentAtom = atom<React.ReactNode | null>(null);
