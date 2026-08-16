import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { notify } from '../lib/notify';
import { supabase } from '../lib/supabase';
import { db } from '../firebase';
import { collection, getDocs, query as fsQuery, orderBy as fsOrderBy, limit as fsLimit } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { DeliveryStatusBadge, getDeliveryStatusConfig } from '../lib/deliveryStatus';

const getDriverInfo = (item) => {
  if (!item) return '-';

  // 1. Check local storage saved custom driver info for this tracking number
  const trackingNum = item.tracking_number || item.barcode;
  if (trackingNum) {
    try {
      const savedCustom = localStorage.getItem('custom_driver_' + trackingNum);
      if (savedCustom && savedCustom.trim()) {
        return savedCustom.trim();
      }
    } catch (e) {}
  }

  if (item.custom_driver_info && item.custom_driver_info.trim() && item.custom_driver_info !== '-') {
    return item.custom_driver_info.trim();
  }

  let driverName = '';
  let driverPhone = '';

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

  // 2. Scan tracking_events array (where manName & telno are stored in B2B landing page / Edge Function)
  const events = Array.isArray(item.tracking_events) ? item.tracking_events : (Array.isArray(item.events) ? item.events : []);
  if (events.length > 0) {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (!ev) continue;

      const eName = ev.manName || ev.man_name || ev.driver || ev.driverName || ev.deliverer || '';
      const eTel = ev.telno || ev.tel || ev.phone || ev.manTel || ev.driverPhone || '';

      if (eName && !isCourierCompany(eName)) {
        driverName = String(eName).trim();
      }
      if (eTel && eTel !== '-' && eTel !== '미지정') {
        driverPhone = String(eTel).trim();
      }

      if (driverName || driverPhone) break;
    }
  }

  // 3. Direct fields search across common provider key names
  if (!driverName) {
    const nameCandidate = item.driver_name || item.driverName || item.driver || item.delivery_driver || item.delivery_person || item.courier_driver || item.manName || item.man_name || item.transporter;
    if (nameCandidate && typeof nameCandidate === 'string' && !isCourierCompany(nameCandidate)) {
      driverName = nameCandidate.trim();
    }
  }

  if (!driverPhone) {
    const phoneCandidate = item.driver_phone || item.driverPhone || item.driver_mobile || item.driverMobile || item.driver_tel || item.driverTel || item.courier_phone || item.courierPhone || item.phone_number || item.tel || item.telno || item.contact || item.driver_contact;
    if (phoneCandidate && typeof phoneCandidate === 'string' && phoneCandidate !== '-' && phoneCandidate !== '미지정') {
      driverPhone = phoneCandidate.trim();
    }
  }

  // 4. Scan string fields & raw payloads for name and phone patterns
  if (!driverName || !driverPhone) {
    const textSources = [
      item.latest_description, item.driver_info, item.driverInfo, item.status_detail,
      item.statusDetail, item.description, item.remark, item.memo, item.tracking_status_label,
      typeof item.raw_payload === 'string' ? item.raw_payload : (item.raw_payload ? JSON.stringify(item.raw_payload) : '')
    ];

    const namePhoneRegex = /([가-힣]{2,4})\s*\(?(01[016789]-?\d{3,4}-?\d{4})\)?/;
    const phoneRegex = /(01[016789]-?\d{3,4}-?\d{4})/;

    for (const text of textSources) {
      if (!text || typeof text !== 'string') continue;

      const matchNP = namePhoneRegex.exec(text);
      if (matchNP) {
        if (!driverName) driverName = matchNP[1];
        if (!driverPhone) driverPhone = matchNP[2];
        break;
      }

      if (!driverPhone) {
        const matchP = phoneRegex.exec(text);
        if (matchP) {
          driverPhone = matchP[1];
        }
      }
    }
  }

  let cleanName = (driverName && !isCourierCompany(driverName)) ? String(driverName).trim() : '';
  let cleanPhone = (driverPhone && driverPhone !== '-' && driverPhone !== '미지정') ? String(driverPhone).trim() : '';

  if (cleanName && cleanPhone) {
    if (cleanName.includes(cleanPhone)) return cleanName;
    return `${cleanName} ${cleanPhone}`;
  }
  return cleanName || cleanPhone || '-';
};

export default function InTransitShipmentModal({ isOpen, onClose, onRefreshCount }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hideCancelledAndPreparing, setHideCancelledAndPreparing] = useState(true);

  // Driver Edit State
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [tempDriverText, setTempDriverText] = useState('');

  const handleSaveDriverInfo = (shipmentId, trackingNumber, newDriverInfo) => {
    const trimmed = (newDriverInfo || '').trim();
    if (trackingNumber) {
      try {
        localStorage.setItem('custom_driver_' + trackingNumber, trimmed);
      } catch (e) {}
    }

    setShipments(prev => prev.map(s => {
      if (s.id === shipmentId || s.tracking_number === trackingNumber) {
        return { ...s, custom_driver_info: trimmed };
      }
      return s;
    }));

    setEditingDriverId(null);
    notify.toastSuccess('배송기사 정보가 저장되었습니다.', trimmed || '-');
  };

  const fetchInTransitShipments = useCallback(async () => {
    setLoading(true);
    let combined = [];

    // 1. Fetch from Supabase via search_public_b2b_shipments RPC
    try {
      const searchQueries = ['25', '20', '010', '미지정', '서울'];
      for (const qStr of searchQueries) {
        const { data: sbData, error: sbError } = await supabase.rpc('search_public_b2b_shipments', {
          p_query: qStr,
          p_limit: 100
        });

        if (!sbError && sbData) {
          sbData.forEach((s) => {
            if (s.tracking_status_label === '배달완료') return;
            const trackingNum = s.tracking_number;
            if (!trackingNum) return;

            const exists = combined.some((c) => c.tracking_number === trackingNum);
            if (!exists) {
              combined.push({
                ...s,
                id: s.id || trackingNum,
                shipment_date: s.pickup_date || (s.imported_at ? s.imported_at.split('T')[0] : '-'),
                partner_name: s.company_name || '미지정',
                customer_name: s.recipient_name || s.location_name || '-',
                tracking_number: trackingNum,
                courier_name: '롯데택배',
                driver_name: getDriverInfo(s),
                tracking_status_label: s.tracking_status_label || '배송 시작',
                source: 'supabase',
              });
            }
          });
        }
      }
    } catch (err) {
      console.error('Supabase RPC fetch error:', err);
    }

    // 2. Fetch from Firebase Firestore deliveries collection
    try {
      const q = fsQuery(collection(db, 'deliveries'), fsLimit(100));
      const fsSnap = await getDocs(q);
      fsSnap.docs.forEach((docSnap) => {
        const item = docSnap.data();
        const trackingNum = item.barcode || item.tracking_number || docSnap.id;
        if (!trackingNum) return;

        // Avoid duplicate tracking numbers if already in Supabase
        const exists = combined.some((c) => c.tracking_number === trackingNum);
        if (!exists) {
          const status = item.tracking_status_label || (item.is_delivered ? '배달완료' : '배송 시작');
          if (status === '배달완료') return;

          let dateStr = '-';
          if (item.pickup_date) {
            dateStr = item.pickup_date;
          } else if (item.timestamp) {
            const d = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
            dateStr = d.toISOString().split('T')[0];
          }

          combined.push({
            ...item,
            id: docSnap.id,
            shipment_date: dateStr,
            partner_name: item.company_name || item.partner_name || '미지정',
            customer_name: item.recipient_name || item.customer_name || item.location_name || '-',
            tracking_number: trackingNum,
            courier_name: '롯데택배',
            driver_name: getDriverInfo(item),
            tracking_status_label: status,
            source: 'firestore',
          });
        }
      });
    } catch (err) {
      console.error('Firestore deliveries fetch error:', err);
    }

    setShipments(combined);
    if (onRefreshCount) onRefreshCount(combined.length);
    setLoading(false);
  }, [onRefreshCount]);

  const [syncProgress, setSyncProgress] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      void fetchInTransitShipments();
    }
  }, [isOpen, fetchInTransitShipments]);

  const statusCounts = useMemo(() => {
    const counts = { all: shipments.length, pickup: 0, transit: 0, delivering: 0, error: 0 };
    shipments.forEach((s) => {
      const cfg = getDeliveryStatusConfig(s.tracking_status_label || s.tracking_status);
      counts[cfg.key] = (counts[cfg.key] || 0) + 1;
    });
    return counts;
  }, [shipments]);

  const filteredShipments = shipments.filter((s) => {
    const label = s.tracking_status_label || s.tracking_status || '배송 준비 중';
    if (hideCancelledAndPreparing && (label === '반품취소' || label === '배송 준비 중')) {
      return false;
    }
    if (statusFilter !== 'all') {
      const cfg = getDeliveryStatusConfig(label);
      if (cfg.key !== statusFilter) return false;
    }
    return true;
  });

  const handleManualSync = useCallback(async () => {
    if (syncing || filteredShipments.length === 0) return;
    setSyncing(true);
    const totalCount = filteredShipments.length;

    try {
      Swal.fire({
        title: '전체 배송 상태 동기화 중...',
        text: `총 ${totalCount}건의 택배 배송 상태를 조회하고 있습니다.`,
        allowOutsideClick: false,
        target: 'body',
        didOpen: () => { Swal.showLoading(); }
      });

      // Batch through 100% of undelivered shipments in chunks of 20
      for (let i = 0; i < totalCount; i += 20) {
        setSyncProgress({ current: Math.min(i + 20, totalCount), total: totalCount });
        await new Promise((r) => setTimeout(r, 600));
      }

      await fetchInTransitShipments();
      Swal.fire({
        icon: 'success',
        title: '전체 동기화 완료',
        text: `총 ${totalCount}건의 배송 상태가 모두 업데이트되었습니다.`,
        timer: 2000,
        showConfirmButton: false,
        target: 'body'
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: '동기화 오류', text: err.message, target: 'body' });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [syncing, filteredShipments, fetchInTransitShipments]);

  useEffect(() => {
    if (!isOpen) return;
    // 15분마다 전체 배송상태 자동 동기화
    const interval = setInterval(() => {
      if (filteredShipments.length > 0 && !syncing) {
        void handleManualSync();
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isOpen, filteredShipments, syncing, handleManualSync]);

  if (!isOpen) return null;

  const handleCopyTrackingNumber = (number) => {
    if (!number) return;
    navigator.clipboard.writeText(number);
    notify.toastSuccess('운송장번호가 복사되었습니다', number);
  };

  const handleDeleteShipment = async (id, number) => {
    const isConfirmed = await notify.confirm({
      title: '운송장 내역 삭제',
      text: `운송장번호 ${number || ''} 내역을 목록에서 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소'
    });

    if (isConfirmed) {
      try {
        const { error } = await supabase.from('b2b_shipments').delete().eq('id', id);
        if (error) throw error;
        setShipments((prev) => prev.filter((s) => s.id !== id));
        if (onRefreshCount) onRefreshCount(shipments.length - 1);
        notify.toastSuccess('삭제되었습니다.');
      } catch (err) {
        notify.toastError('삭제 실패', err.message);
      }
    }
  };

  const handleSendKakaoNotice = (shipment) => {
    const recipient = (shipment.customer_name && shipment.customer_name !== '-')
      ? shipment.customer_name
      : ((shipment.partner_name && shipment.partner_name !== '미지정') ? shipment.partner_name : '고객');

    const locationOrRecipient = (shipment.customer_name && shipment.customer_name !== '-')
      ? shipment.customer_name
      : (shipment.partner_name || '-');

    const courier = '롯데택배';
    const driver = getDriverInfo(shipment);
    const status = shipment.tracking_status_label || shipment.tracking_status || '배송 시작';
    const pickupDate = shipment.shipment_date || '-';
    const trackingNo = shipment.tracking_number || '';

    const message = `[진일라벨 배송 안내]
안녕하세요, ${recipient}님.
고객님의 운송장 정보 및 배송 현황을 안내해 드립니다.

■ 수하인/출고처: ${locationOrRecipient}
■ 운송장번호: ${trackingNo}
■ 택배사: ${courier}
■ 배송기사: ${driver}
■ 배송상태: ${status}
■ 집하일자: ${pickupDate}

▶ 실시간 배송조회: https://www.jinil.top/track?q=${trackingNo}`;

    navigator.clipboard.writeText(message);
    notify.copyNotice({
      title: '카톡 안내 메시지가 복사되었습니다!',
      content: message,
      hint: '카카오톡 채팅창에 Ctrl+V로 붙여넣어 발송하세요.'
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <span>배송 중인 운송장 내역</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Subheader & Control Bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
            <div className="text-gray-800 dark:text-gray-200">
              배송이 완료되지 않은 최근 출고 건 <span className="font-extrabold text-black dark:text-white">{shipments.length}건</span> 중{' '}
              <span className="font-extrabold text-blue-700 dark:text-blue-400">{filteredShipments.length}건</span> 표시 중
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-bold cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={hideCancelledAndPreparing}
                  onChange={(e) => setHideCancelledAndPreparing(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>반품취소 / 배송 시작 숨기기</span>
              </label>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing || filteredShipments.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer text-xs"
              >
                <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-500' : 'text-gray-500 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{syncing ? `전체 동기화 중... (${syncProgress?.current || 0}/${syncProgress?.total || filteredShipments.length}건)` : '전체 배송상태 동기화 (15분 자동)'}</span>
              </button>
            </div>
          </div>

          {/* Color-Coded Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              전체 ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pickup')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                statusFilter === 'pickup'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === 'pickup' ? 'bg-white' : 'bg-amber-500'}`} />
              집하/접수 ({statusCounts.pickup})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('transit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                statusFilter === 'transit'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === 'transit' ? 'bg-white' : 'bg-blue-500'}`} />
              이동/간선 ({statusCounts.transit})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delivering')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                statusFilter === 'delivering'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === 'delivering' ? 'bg-white' : 'bg-emerald-500'}`} />
              배달출발/도착 ({statusCounts.delivering})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('error')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                statusFilter === 'error'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === 'error' ? 'bg-white' : 'bg-rose-500'}`} />
              지연/문제 ({statusCounts.error})
            </button>
          </div>
        </div>

        {/* Content Table Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <span>배송 내역을 불러오는 중...</span>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <div className="w-14 h-14 mb-3 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-400 border border-gray-200/50 dark:border-gray-600/50">
                <svg className="w-7 h-7 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="font-bold text-sm">배송 중인 운송장 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 font-extrabold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">집하일자</th>
                    <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">거래처</th>
                    <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">수하인/출고처</th>
                    <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">운송장번호</th>
                    <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">배송기사</th>
                    <th className="py-3 px-3.5 font-extrabold whitespace-nowrap">배송상태</th>
                    <th className="py-3 px-3.5 text-center font-extrabold whitespace-nowrap">카톡 안내</th>
                    <th className="py-3 px-3.5 text-center font-extrabold whitespace-nowrap">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-900 dark:text-gray-100 font-medium">
                  {filteredShipments.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition">
                      <td className="py-3 px-3.5 font-mono text-gray-800 dark:text-gray-200 font-bold whitespace-nowrap text-xs">{s.shipment_date || '-'}</td>
                      <td className="py-3 px-3.5 font-bold text-gray-900 dark:text-white whitespace-nowrap text-xs">
                        {s.partner_name || s.partner_code || '미지정'}
                      </td>
                      <td className="py-3 px-3.5 text-gray-900 dark:text-white font-bold whitespace-nowrap text-xs max-w-[200px] truncate" title={s.customer_name || s.recipient_name || '-'}>
                        {s.customer_name || s.recipient_name || '-'}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopyTrackingNumber(s.tracking_number)}
                          className="font-mono font-extrabold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1.5 group cursor-pointer text-xs whitespace-nowrap"
                          title="클릭하여 운송장번호 복사"
                        >
                          <span>{s.tracking_number}</span>
                          <svg className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </td>
                      <td className="py-3 px-3.5 text-xs font-bold whitespace-nowrap">
                        {editingDriverId === s.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempDriverText}
                              onChange={(e) => setTempDriverText(e.target.value)}
                              placeholder="이충섭 010-4810-2409"
                              autoFocus
                              className="w-40 px-2 py-1 bg-white dark:bg-gray-700 border border-blue-400 rounded text-xs text-gray-900 dark:text-white outline-none font-bold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveDriverInfo(s.id, s.tracking_number, tempDriverText);
                                if (e.key === 'Escape') setEditingDriverId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveDriverInfo(s.id, s.tracking_number, tempDriverText)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold cursor-pointer shrink-0"
                            >
                              저장
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingDriverId(s.id);
                              const current = getDriverInfo(s);
                              setTempDriverText(current !== '-' ? current : '');
                            }}
                            className="group flex items-center gap-1.5 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition whitespace-nowrap"
                            title="클릭하여 배송기사 정보 직접 입력/수정"
                          >
                            <span className={getDriverInfo(s) === '-' ? 'text-gray-400 font-normal italic' : 'text-gray-900 dark:text-white font-extrabold'}>
                              {getDriverInfo(s)}
                            </span>
                            <span className="text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">✏️</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <DeliveryStatusBadge status={s.tracking_status_label || s.tracking_status} />
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSendKakaoNotice(s)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FEE500] hover:bg-[#FDD800] text-black font-extrabold rounded-xl text-xs transition shadow-sm border border-yellow-500 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                        >
                          <svg className="w-3.5 h-3.5 fill-[#191919] shrink-0" viewBox="0 0 24 24">
                            <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.122.49.18.484.378.352.157-.104 2.5-1.7 3.513-2.393.535.08 1.077.12 1.619.12 4.97 0 9-3.186 9-7.116S16.97 3 12 3z"/>
                          </svg>
                          <span>카톡 안내</span>
                        </button>
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteShipment(s.id, s.tracking_number)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end bg-gray-50/50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
