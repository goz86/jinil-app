import Swal from 'sweetalert2';

/**
 * 🎨 Toss & Apple Minimalist Notification System for Jinil App
 */

// Custom Toast Mixin with glassmorphism styling
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: false,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

export const notify = {
    /**
     * 🟢 Success Toast Notification
     */
    toastSuccess(title, text = '') {
        return Toast.fire({
            icon: 'success',
            title: title,
            text: text
        });
    },

    /**
     * 🔴 Error Toast Notification
     */
    toastError(title, text = '') {
        return Toast.fire({
            icon: 'error',
            title: title,
            text: text
        });
    },

    /**
     * 🔵 Info Toast Notification
     */
    toastInfo(title, text = '') {
        return Toast.fire({
            icon: 'info',
            title: title,
            text: text
        });
    },

    /**
     * 📋 Modern Copy Preview Modal (for Tracking Numbers, Kakao Messages, etc.)
     */
    copyNotice({ title, text, content, hint = '카카오톡 채팅창에 Ctrl+V로 붙여넣어 발송하세요.' }) {
        let htmlContent = '';
        if (content) {
            htmlContent = `
                <div style="text-align: left; background: rgba(0,0,0,0.04); padding: 14px 16px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); font-family: monospace; font-size: 12px; line-height: 1.6; color: #334155; margin-top: 10px; max-height: 180px; overflow-y: auto;">
                    <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; font-family: inherit;">${content}</pre>
                </div>
            `;
        }
        if (hint) {
            htmlContent += `<p style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 10px; margin-bottom: 0;">${hint}</p>`;
        }

        return Swal.fire({
            icon: 'info',
            title: title,
            text: text,
            html: htmlContent,
            confirmButtonText: '확인 (Close)',
            buttonsStyling: true,
        });
    },

    /**
     * 💡 Center Alert Modal
     */
    alert({ icon = 'success', title, text = '' }) {
        return Swal.fire({
            icon,
            title,
            text,
            confirmButtonText: '확인',
        });
    },

    /**
     * ❓ Confirm Dialog Modal
     */
    async confirm({ title, text, confirmText = '확인', cancelText = '취소' }) {
        const result = await Swal.fire({
            icon: 'warning',
            title,
            text,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            reverseButtons: true,
        });
        return result.isConfirmed;
    }
};

export default notify;
