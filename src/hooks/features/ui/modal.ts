import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { modalOpenAtom, modalContentAtom } from "@/lib/atoms/modal";

type ModalSetterProps = Partial<{
  open: boolean;
  content: React.ReactNode | null;
}>;

export function useModalSetter(): (props: ModalSetterProps) => void {
  const setModalOpen = useSetAtom(modalOpenAtom);
  const setModalContent = useSetAtom(modalContentAtom);
  return (props: ModalSetterProps) => {
    if (props.open !== undefined) {
      setModalOpen(props.open);
    }
    if (props.content !== undefined) {
      setModalContent(props.content);
    }
  };
}

export function useModalOpen(): boolean {
  return useAtomValue(modalOpenAtom);
}

export function useModalContent(): React.ReactNode | null {
  return useAtomValue(modalContentAtom);
}
