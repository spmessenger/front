import React from "react";
import { Modal as AntdModal } from "antd";
import { useModalContent, useModalOpen } from "@/hooks/features/ui/modal";

export default function Modal() {
  const modalOpen = useModalOpen();
  const modalContent = useModalContent();
  return <AntdModal open={modalOpen}>{modalContent}</AntdModal>;
}
