import { useAtomValue, useSetAtom } from "jotai";
import { modalAtom } from "@/lib/atoms/modal";
import type { ModalAtom, ModalSetterProps } from "@/lib/types/atoms";

export function useModal(): ModalAtom {
  return useAtomValue(modalAtom);
}

export function useModalSetter(): (props: ModalSetterProps) => void {
  const modal = useAtomValue(modalAtom);
  const setModal = useSetAtom(modalAtom);
  return (props: ModalSetterProps) => {
    if (props.clear) {
      setModal({});
      return;
    }
    setModal({ ...modal, ...props });
  };
}
