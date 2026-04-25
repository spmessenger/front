import { create } from "zustand";
import type { ModalAtom, ModalSetterProps } from "@/lib/types/atoms";

type UiStore = {
  modal: ModalAtom;
  setModal: (props: ModalSetterProps) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  modal: {},
  setModal: (props) =>
    set((state) => {
      if (props.clear) {
        return { modal: {} };
      }
      return { modal: { ...state.modal, ...props } };
    }),
}));
