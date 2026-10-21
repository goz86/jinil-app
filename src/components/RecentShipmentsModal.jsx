import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { notify } from '../lib/notify';
import { resolveShipmentDisplay } from '../lib/shipmentAddressRules';

const RECENT_SHIPMENT_WINDOW_DAYS = 3;

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + diff);
  return next;
}

function defaultShipmentWindowStart() {
  return formatDateKey(addDays(startOfToday(), -(RECENT_SHIPMENT_WINDOW_DAYS - 1)));
}

function getFilterSinceDate(filter, windowStart) {
  if (filter === 'today') return formatDateKey(startOfToday());
  if (filter === 'week') return formatDateKey(startOfWeek());
  if (filter === 'month') {
    const today = startOfToday();
    return formatDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  return windowStart;
}

const shipmentDateFilters = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
];

const getDriverInfo = (item) => {
  if (!item) return '-';
  const trackingNum = item.tracking_number || item.barcode;
  if (trackingNum) {
    try {
      const savedCustom = localStorage.getItem('custom_driver_' + trackingNum);
      if (savedCustom && savedCustom.trim()) return savedCustom.trim();
    } catch (e) {}
  }

  if (item.custom_driver_info && item.custom_driver_info.trim() && item.custom_driver_info !== '-') {
    return item.custom_driver_info.trim();
  }

  let driverName = item.courier_name || item.driver_name || item.driverName || '';
  let driverPhone = item.courier_phone || item.driver_phone || item.driverPhone || '';

  const isCourierCompany = (str) => {
    if (!str || typeof str !== 'string') return true;
    const lower = str.toLowerCase().trim();
    return (
      lower === '-' || lower === '미지정' ||
      lower.includes('롯데') || lower.includes('대한통운') || lower.includes('cj') ||
      lower.includes('한진') || lower.includes('우체국') || lower.includes('로젠') ||
      lower.includes('경동') || lower.includes('합동') || lower.includes('택배')
    );
  };

  if (isCourierCompany(driverName)) driverName = '';

  const events = Array.isArray(item.tracking_events) ? item.tracking_events : [];
  if ((!driverName || !driverPhone) && events.length > 0) {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (!ev) continue;
      const eName = ev.manName || ev.man_name || ev.driver || ev.driverName || '';
      const eTel = ev.telno || ev.tel || ev.phone || ev.manTel || '';
      if (!driverName && eName && !isCourierCompany(eName)) driverName = String(eName).trim();
      if (!driverPhone && eTel && eTel !== '-' && eTel !== '미지정') driverPhone = String(eTel).trim();
      if (driverName && driverPhone) break;
    }
  }

  const parts = [driverName, driverPhone].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '-';
};

export default function RecentShipmentsModal({ isOpen, onClose }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [shipmentWindowStart, setShipmentWindowStart] = useState(defaultShipmentWindowStart);
  const [copiedKakaoId, setCopiedKakaoId] = useState(null);
  const scrollContainerRef = useRef(null);

  const activeSinceDate = useMemo(
    () => getFilterSinceDate(dateFilter, shipmentWindowStart),
    [dateFilter, shipmentWindowStart]
  );

  const fetchShipments = useCallback(async (isLoadMore = false, overrideBeforeDate = null) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // If user typed a search term of 2 or more characters, use it; otherwise use '25' to capture all shipments
      const searchQuery = query.trim().length >= 2 ? query.trim() : '25';
      const beforeDate = isLoadMore ? (overrideBeforeDate || shipmentWindowStart) : null;

      const { data, error } = await supabase.rpc('search_public_b2b_shipments', {
        p_query: searchQuery,
        p_before_date: beforeDate,
        p_limit: 200,
      });

      if (error) throw error;

      const formatted = (data || []).map((s) => ({
        ...s,
        id: s.id || s.tracking_number,
        pickup_date: s.pickup_date || (s.imported_at ? s.imported_at.split('T')[0] : '-'),
      }));

      setShipments((prev) => {
        if (isLoadMore) {
          const map = new Map();
          prev.forEach((item) => {
            if (item.tracking_number) map.set(item.tracking_number, item);
          });
          formatted.forEach((item) => {
            if (item.tracking_number) map.set(item.tracking_number, item);
          });
          return Array.from(map.values());
        }
        return formatted;
      });
    } catch (err) {
      console.error('Failed to load recent shipments:', err);
      notify.toastError('운송장 데이터를 불러오지 못했습니다.', err.message);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      void fetchShipments(false);
    }
  }, [isOpen, fetchShipments]);

  const handleLoadOlder = async () => {
    if (loadingMore) return;

    // 1. Memorize current scroll position before loading
    const container = scrollContainerRef.current;
    const prevScrollTop = container ? container.scrollTop : 0;

    // 2. Find the earliest/oldest pickup_date currently in shipments
    let targetBeforeDate = shipmentWindowStart;
    if (shipments.length > 0) {
      let oldest = null;
      for (const s of shipments) {
        if (s.pickup_date && s.pickup_date !== '-') {
          if (!oldest || s.pickup_date < oldest) oldest = s.pickup_date;
        }
      }
      if (oldest) targetBeforeDate = oldest;
    }

    const nextWindow = formatDateKey(addDays(new Date(targetBeforeDate), -15));
    setShipmentWindowStart(nextWindow);

    await fetchShipments(true, targetBeforeDate);

    // 3. Keep scroll position without jumping to top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = prevScrollTop;
        }
      });
    });
  };

  const filteredShipments = useMemo(() => {
    let list = shipments;

    // Filter by Date
    if (dateFilter !== 'all') {
      list = list.filter((s) => {
        if (!s.pickup_date || s.pickup_date === '-') return false;
        return s.pickup_date >= activeSinceDate;
      });
    }

    // Filter by Query (Client-side refinement)
    const term = query.trim().toLowerCase();
    if (term) {
      list = list.filter((s) => {
        const { displayName, displayAddress, displayCompany } = resolveShipmentDisplay(s);
        return [
          s.tracking_number,
          s.company_name,
          displayCompany,
          s.location_name,
          s.recipient_name,
          displayName,
          s.recipient_address,
          displayAddress,
          s.delivery_center,
          s.courier_name,
          s.courier_phone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      });
    }

    return list;
  }, [shipments, dateFilter, activeSinceDate, query]);

  // Group by pickup_date in descending order
  const groupedShipments = useMemo(() => {
    const groups = {};
    filteredShipments.forEach((s) => {
      const dateKey = s.pickup_date || '날짜 미지정';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(s);
    });

    // Sort dates descending
    const sortedEntries = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    return sortedEntries;
  }, [filteredShipments]);

  const handleCopyTrackingNumber = (number) => {
    if (!number) return;
    navigator.clipboard.writeText(number);
    notify.toastSuccess('운송장번호가 복사되었습니다', number);
  };

  const handleSendKakaoNotice = (shipment) => {
    const { displayName } = resolveShipmentDisplay(shipment);
    const recipient = displayName !== '-' ? displayName : (shipment.location_name || shipment.recipient_name || shipment.company_name || '고객');
    const status = shipment.tracking_status_label || shipment.tracking_status || '배송 시작';
    const trackingNum = shipment.tracking_number || '';
    const trackingUrl = `https://www.jinil.top/track?q=${trackingNum}`;
    const pickupDate = shipment.pickup_date || '-';
    const driverInfo = getDriverInfo(shipment);

    const message = `[진일라벨 배송 안내]
안녕하세요, ${recipient}님.
고객님의 운송장 정보 및 배송 현황을 안내해 드립니다.

■ 수하인/출고처: ${recipient}
■ 운송장번호: ${trackingNum}
■ 택배사: 롯데택배
■ 배송기사: ${driverInfo}
■ 배송상태: ${status}
■ 집하일자: ${pickupDate}

▶ 실시간 배송조회: ${trackingUrl}`;

    setCopiedKakaoId(shipment.id);
    setTimeout(() => setCopiedKakaoId(null), 2500);

    navigator.clipboard.writeText(message);
    notify.copyNotice({
      title: '카톡 안내 메시지가 복사되었습니다!',
      content: message,
      hint: '카카오톡 채팅창에 Ctrl+V로 붙여넣어 발송하세요.'
    });

    // Trigger desktop KakaoTalk PC scheme
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'kakaotalk://';
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    } catch (e) {
      window.location.href = 'kakaotalk://';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6 animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header matching Image 2 */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                최근 저장된 운송장
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
              날짜별로 저장된 출고 데이터를 확인합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input matching Image 2 */}
            <div className="relative w-full md:w-80">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="회사, 수하인, 운송장 검색"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-9 pr-8 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => void fetchShipments(false)}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
              title="새로고침"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Date Filter Toolbar matching Image 2 */}
        <div className="px-6 py-3 bg-gray-50/70 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {shipmentDateFilters.map((filter) => {
              const active = dateFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setDateFilter(filter.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <span>
              현재 <strong className="text-gray-900 dark:text-white font-mono">{activeSinceDate}</strong> 이후 데이터 표시 중
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-extrabold">
              총 {filteredShipments.length.toLocaleString()}건
            </span>
          </div>
        </div>

        {/* Content Area with Grouped Date Sections */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-6">
          {loading && shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3.5" />
              <span className="font-bold text-sm">출고 데이터를 불러오는 중...</span>
            </div>
          ) : groupedShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <div className="w-16 h-16 mb-3 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-400 border border-gray-200/50 dark:border-gray-600/50">
                <svg className="w-8 h-8 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="font-bold text-sm">해당 기간의 출고 데이터가 없습니다.</p>
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  검색어 지우기
                </button>
              )}
            </div>
          ) : (
            groupedShipments.map(([date, rows]) => (
              <section key={date} className="overflow-hidden rounded-xl border border-gray-200/90 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
                {/* Section Date Header with Truck Count Badge matching Image 2 */}
                <div className="flex items-center justify-between bg-gray-50/80 dark:bg-gray-750 px-4 py-3 border-b border-gray-150 dark:border-gray-700">
                  <h3 className="font-black text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{date}</span>
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    <span>{rows.length.toLocaleString()}건</span>
                  </span>
                </div>

                {/* Table matching Image 2 columns */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 font-extrabold border-b border-gray-150 dark:border-gray-700">
                      <tr>
                        <th className="py-2.5 px-3.5 whitespace-nowrap">운송장번호</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap">거래처</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap">수하인/출고처</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap">주소</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap">도착점</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap">택배사/기사</th>
                        <th className="py-2.5 px-3.5 text-center whitespace-nowrap">카톡 안내</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                      {rows.map((shipment) => {
                        const { displayName, displayAddress, displayCompany } = resolveShipmentDisplay(shipment);
                        const driverText = getDriverInfo(shipment);

                        return (
                          <tr key={shipment.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition">
                            {/* 운송장번호 with Click-to-copy */}
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleCopyTrackingNumber(shipment.tracking_number)}
                                className="font-mono font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1.5 group cursor-pointer text-xs"
                                title="클릭하여 운송장번호 복사"
                              >
                                <span>{shipment.tracking_number}</span>
                                <svg className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </td>

                            {/* 거래처 */}
                            <td className="py-2.5 px-3.5 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                              {displayCompany || shipment.company_name || '-'}
                            </td>

                            {/* 수하인/출고처 */}
                            <td className="py-2.5 px-3.5 text-gray-900 dark:text-white font-extrabold whitespace-nowrap max-w-[180px] truncate" title={displayName}>
                              {displayName}
                            </td>

                            {/* 주소 */}
                            <td className="py-2.5 px-3.5 text-gray-500 dark:text-gray-400 max-w-[280px] truncate" title={displayAddress}>
                              {displayAddress}
                            </td>

                            {/* 도착점 */}
                            <td className="py-2.5 px-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {shipment.delivery_center || '-'}
                            </td>

                            {/* 택배사/기사 */}
                            <td className="py-2.5 px-3.5 text-gray-800 dark:text-gray-200 font-semibold whitespace-nowrap">
                              {driverText}
                            </td>

                            {/* 카톡 안내 button matching Image 2 */}
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSendKakaoNotice(shipment)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 font-extrabold rounded-xl text-xs transition shadow-xs border cursor-pointer active:scale-95 whitespace-nowrap ${
                                  copiedKakaoId === shipment.id
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] border-yellow-500'
                                }`}
                                title="카카오톡 안내 문구 복사 & 카톡 실행"
                              >
                                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                                  <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.122.49.18.484.378.352.157-.104 2.5-1.7 3.513-2.393.535.08 1.077.12 1.619.12 4.97 0 9-3.186 9-7.116S16.97 3 12 3z"/>
                                </svg>
                                <span>{copiedKakaoId === shipment.id ? '복사됨!' : '카톡 안내'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}

          {/* Load Older Window Button when filter is 'all' */}
          {dateFilter === 'all' && (
            <div className="flex flex-col items-center justify-center gap-2 pt-2 pb-4">
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <svg className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${loadingMore ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span>{loadingMore ? '이전 데이터 불러오는 중...' : `${shipmentWindowStart} 이전 데이터 불러오기`}</span>
              </button>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                현재 {activeSinceDate} 이후 데이터 표시 중
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            총 <span className="font-extrabold text-blue-600 dark:text-blue-400">{filteredShipments.length}</span>개의 운송장이 표시되고 있습니다.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition text-xs cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
