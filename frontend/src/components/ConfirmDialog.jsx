import React from "react";
import Modal from "./Modal";

const ConfirmDialog = ({ open, onClose, onConfirm, message }) => (
  <Modal open={open} onClose={onClose} title="تأكيد الحذف">
    <p className="text-sand-600 mb-5">{message || "هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء."}</p>
    <div className="flex gap-2 justify-end">
      <button className="btn-secondary" onClick={onClose}>
        إلغاء
      </button>
      <button
        className="btn-danger"
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        حذف
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
