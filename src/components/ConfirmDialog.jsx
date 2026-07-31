import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'تأكيد الحذف', message, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            إلغاء
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'جارٍ الحذف…' : 'تأكيد'}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  )
}
