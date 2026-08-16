import React from 'react';

/**
 * Categorize delivery status into 4 distinct visual styles:
 * 1. pickup: Đang lấy hàng / Chuẩn bị (Yellow / Amber)
 * 2. transit: Đang trung chuyển (Blue / Sky)
 * 3. delivering: Đang phát trong ngày / Đang giao (Green / Emerald)
 * 4. error: Chậm trễ / Có vấn đề / Hủy (Red / Rose)
 */
export function getDeliveryStatusConfig(statusLabel) {
    const raw = (statusLabel || '배송 시작').trim();

    // 1. Chậm trễ / Có vấn đề / Hủy / Trả hàng (Đỏ - Red / Rose)
    if (
        raw.includes('지연') ||
        raw.includes('취소') ||
        raw.includes('미배달') ||
        raw.includes('사고') ||
        raw.includes('반송') ||
        raw.includes('거절') ||
        raw.includes('문제') ||
        raw.includes('중단') ||
        raw.includes('불명') ||
        raw.includes('오발송')
    ) {
        return {
            key: 'error',
            label: raw,
            categoryName: '지연/문제',
            bg: 'bg-rose-50 dark:bg-rose-950/40',
            text: 'text-rose-700 dark:text-rose-300',
            border: 'border-rose-200 dark:border-rose-800/60',
            dot: 'bg-rose-500',
            pulseDot: 'bg-rose-400',
            ring: 'ring-rose-500/20'
        };
    }

    // 2. Đang phát trong ngày / Đang giao / Giao hoàn tất (Xanh lá đậm - Emerald / Green)
    if (
        raw.includes('배달출발') ||
        raw.includes('배송출발') ||
        raw.includes('배달중') ||
        raw.includes('도착') ||
        raw.includes('배달완료') ||
        raw.includes('배송완료')
    ) {
        return {
            key: 'delivering',
            label: raw,
            categoryName: '배달출발/도착',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            text: 'text-emerald-700 dark:text-emerald-300',
            border: 'border-emerald-200 dark:border-emerald-800/60',
            dot: 'bg-emerald-500',
            pulseDot: 'bg-emerald-400',
            ring: 'ring-emerald-500/20'
        };
    }

    // 3. Đang lấy hàng / Đang chuẩn bị (Vàng - Amber / Yellow)
    if (
        raw.includes('집하') ||
        raw.includes('접수') ||
        raw.includes('준비') ||
        raw.includes('인수') ||
        raw.includes('상품준비')
    ) {
        return {
            key: 'pickup',
            label: raw,
            categoryName: '집하/접수',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            text: 'text-amber-700 dark:text-amber-300',
            border: 'border-amber-200 dark:border-amber-800/60',
            dot: 'bg-amber-500',
            pulseDot: 'bg-amber-400',
            ring: 'ring-amber-500/20'
        };
    }

    // 4. Đang trung chuyển / Vận chuyển (Xanh dương - Blue)
    return {
        key: 'transit',
        label: raw,
        categoryName: '이동/간선',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-500',
        pulseDot: 'bg-blue-400',
        ring: 'ring-blue-500/20'
    };
}

/**
 * Reusable DeliveryStatusBadge Component
 */
export function DeliveryStatusBadge({ status, className = '', showPulse = false }) {
    const config = getDeliveryStatusConfig(status);

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border shrink-0 whitespace-nowrap shadow-2xs transition-colors ${config.bg} ${config.text} ${config.border} ${className}`}
        >
            <span className="relative flex h-2 w-2">
                {showPulse && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pulseDot}`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
            </span>
            <span>{config.label}</span>
        </span>
    );
}
