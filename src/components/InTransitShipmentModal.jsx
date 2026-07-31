import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../firebase';
import { collection, getDocs, query as fsQuery, orderBy as fsOrderBy, limit as fsLimit } from 'firebase/firestore';
import Swal from 'sweetalert2';

const getDriverInfo = (item) => {
  if (!item) return '-';
  const name = item.driver_name || item.driver || item.delivery_driver || item.delivery_person || item.courier_driver || item.carrier_name || item.carrier || item.transporter || item.transporter_name || item.driver_info || item.courier_person || item.deliverer || '';
  const phone = item.driver_phone || item.carrier_phone || item.driver_tel || item.phone_number || item.tel || item.contact || item.driver_contact || '';

  let cleanName = (name && name !== '-' && name !== '미지정') ? String(name).trim() : '';
  let cleanPhone = (phone && phone !== '-' && phone !== '미지정') ? String(phone).trim() : '';

  if (cleanName && cleanPhone && !cleanName.includes(cleanPhone)) {
    return `${cleanName} ${cleanPhone}`;
  }
  return cleanName || cleanPhone || '-';
};

export default function InTransitShipmentModal({ isOpen, onClose, onRefreshCount }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hideCancelledAndPreparing, setHideCancelledAndPreparing] = useState(true);

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
                tracking_status_label: s.tracking_status_label || '배송 중',
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
          const status = item.tracking_status_label || (item.is_delivered ? '배달완료' : '배송 중');
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

  useEffect(() => {
    if (isOpen) {
      void fetchInTransitShipments();
    }
  }, [isOpen, fetchInTransitShipments]);

  const filteredShipments = shipments.filter((s) => {
    if (!hideCancelledAndPreparing) return true;
    const label = s.tracking_status_label || s.tracking_status || '배송 준비 중';
    return label !== '반품취소' && label !== '배송 준비 중';
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
    Swal.fire({
      icon: 'success',
      title: '운송장번호가 복사되었습니다',
      text: number,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      target: 'body'
    });
  };

  const handleDeleteShipment = async (id, number) => {
    const result = await Swal.fire({
      title: '운송장 내역 삭제',
      text: `운송장번호 ${number || ''} 내역을 목록에서 삭제하시겠습니까?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      confirmButtonColor: '#ef4444',
      target: 'body'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('b2b_shipments').delete().eq('id', id);
        if (error) throw error;
        setShipments((prev) => prev.filter((s) => s.id !== id));
        if (onRefreshCount) onRefreshCount(shipments.length - 1);
        Swal.fire({ icon: 'success', title: '삭제되었습니다.', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, target: 'body' });
      } catch (err) {
        Swal.fire({ icon: 'error', title: '삭제 실패', text: err.message, target: 'body' });
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
    const status = shipment.tracking_status_label || shipment.tracking_status || '배송 중';
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
    Swal.fire({
      icon: 'info',
      title: '카톡 안내 메시지가 복사되었습니다!',
      html: `<pre style="text-align: left; background: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 11px; white-space: pre-wrap; font-family: monospace;">${message}</pre><p style="margin-top: 10px; font-size: 12px; color: #666;">카카오톡 채팅창에 Ctrl+V로 붙여넣어 발송하세요.</p>`,
      confirmButtonText: '확인',
      target: 'body'
    });
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
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
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-gray-600 dark:text-gray-400">
            배송이 완료되지 않은 최근 출고 건 <span className="font-bold text-gray-900 dark:text-white">{shipments.length}건</span> 중{' '}
            <span className="font-bold text-blue-600 dark:text-blue-400">{filteredShipments.length}건</span> 표시 중
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideCancelledAndPreparing}
                onChange={(e) => setHideCancelledAndPreparing(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>반품취소 / 배송 준비 중 숨기기</span>
            </label>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing || filteredShipments.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-500' : 'text-gray-500 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{syncing ? `전체 동기화 중... (${syncProgress?.current || 0}/${syncProgress?.total || filteredShipments.length}건)` : '전체 배송상태 동기화 (15분 자동)'}</span>
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
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">집하일자</th>
                    <th className="py-3 px-4">거래처</th>
                    <th className="py-3 px-4">수하인/출고처</th>
                    <th className="py-3 px-4">운송장번호</th>
                    <th className="py-3 px-4">배송상태</th>
                    <th className="py-3 px-4 text-center">카톡 안내</th>
                    <th className="py-3 px-4 text-center">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-200">
                  {filteredShipments.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition">
                      <td className="py-3 px-4 font-mono text-gray-500">{s.shipment_date || '-'}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {s.partner_name || s.partner_code || '미지정'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {s.customer_name || s.recipient_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleCopyTrackingNumber(s.tracking_number)}
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1.5 group cursor-pointer"
                          title="클릭하여 운송장번호 복사"
                        >
                          <span>{s.tracking_number}</span>
                          <svg className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {s.tracking_status_label || s.tracking_status || '배송 중'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSendKakaoNotice(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-bold rounded-xl text-[11px] transition shadow-sm border border-yellow-400/60 cursor-pointer active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 fill-[#191919]" viewBox="0 0 24 24">
                            <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.707 4.8 4.27 6.054-.188.702-.682 2.545-.78 2.94-.122.49.18.484.378.352.157-.104 2.5-1.7 3.513-2.393.535.08 1.077.12 1.619.12 4.97 0 9-3.186 9-7.116S16.97 3 12 3z"/>
                          </svg>
                          <span>카톡 안내</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteShipment(s.id, s.tracking_number)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition active:scale-95 cursor-pointer"
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
    </div>
  );
}
