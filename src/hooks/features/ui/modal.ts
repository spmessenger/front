import React from "react";
import type { ModalAtom, ModalSetterProps } from "@/lib/types/atoms";
import { useUiStore } from "@/lib/stores/ui";

export function useModal(): ModalAtom {
  return useUiStore((state) => state.modal);
}

export function useModalSetter(): (props: ModalSetterProps) => void {
  const setModal = useUiStore((state) => state.setModal);
  return React.useCallback(
    (props: ModalSetterProps) => setModal(props),
    [setModal]
  );
}
