import React from "react";
import { Modal as AntdModal } from "antd";
import { useModal } from "@/hooks/features/ui/modal";

export default function Modal() {
  const modal = useModal();
  return (
    <AntdModal
      title={modal.title}
      open={modal.open}
      footer={modal.footer}
      confirmLoading={modal.confirmLoading}
      onOk={modal.onOk}
      okText={modal.okText}
      cancelText={modal.cancelText}
      onCancel={modal.onCancel}
      closable={false}
    >
      {modal.content}
    </AntdModal>
  );
}
