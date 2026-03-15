import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { modalAtom } from "@/lib/atoms/modal";
import type { ModalAtom, ModalSetterProps } from "@/lib/types/atoms";

export function useModal(): ModalAtom {
  return useAtomValue(modalAtom);
}

export function useModalSetter(): (props: ModalSetterProps) => void {
  const setModal = useSetAtom(modalAtom);
  return React.useCallback(
    (props: ModalSetterProps) => {
      if (props.clear) {
        setModal({});
        return;
      }

      setModal((prev) => ({ ...prev, ...props }));
    },
    [setModal]
  );
}
