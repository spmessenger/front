export type ModalAtom = Partial<{
  open: boolean;
  content: React.ReactNode;
  title: string;
  footer: React.ReactNode | null;
  className: string;
  confirmLoading: boolean;
  cancelText: string;
  okText: string;
  onOk: () => void;
  onCancel: () => void;
}>;

export type ModalSetterProps = { clear?: boolean } & ModalAtom;
