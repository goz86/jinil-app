import React from 'react';

export default function InvoiceWidget() {
    return (
        <div className="w-full h-full min-h-[850px] rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm">
            <iframe
                src="/invoice-app/index.html"
                title="거래명세서 발행"
                className="w-full h-[880px] border-none"
            />
        </div>
    );
}
