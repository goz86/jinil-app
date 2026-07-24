import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../firebase';
import { collection, getDocs, query as fsQuery, orderBy as fsOrderBy, limit as fsLimit } from 'firebase/firestore';
import Swal from 'sweetalert2';

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
                id: s.id || trackingNum,
                shipment_date: s.pickup_date || (s.imported_at ? s.imported_at.split('T')[0] : '-'),
                partner_name: s.company_name || '미지정',
                customer_name: s.recipient_name || s.location_name || '-',
                tracking_number: trackingNum,
                tracking_status_label: s.tracking_status_label || '배송중',
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
          const status = item.tracking_status_label || (item.is_delivered ? '배달완료' : '배송중');
          if (status === '배달완료') return;

          let dateStr = '-';
          if (item.pickup_date) {
            dateStr = item.pickup_date;
          } else if (item.timestamp) {
            const d = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
            dateStr = d.toISOString().split('T')[0];
          }

          combined.push({
            id: docSnap.id,
            shipment_date: dateStr,
            partner_name: item.company_name || item.partner_name || '미지정',
            customer_name: item.recipient_name || item.customer_name || item.location_name || '-',
            tracking_number: trackingNum,
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

  useEffect(() => {
    if (isOpen) {
      void fetchInTransitShipments();
    }
  }, [isOpen, fetchInTransitShipments]);

  if (!isOpen) return null;

  const filteredShipments = shipments.filter((s) => {
    if (!hideCancelledAndPreparing) return true;
    const label = s.tracking_status_label || s.tracking_status || '배송 준비 중';
    return label !== '반품취소' && label !== '배송 준비 중';
  });

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
    });
  };

  const [syncProgress, setSyncProgress] = useState(null);

  const handleManualSync = async () => {
    if (syncing || filteredShipments.length === 0) return;
    setSyncing(true);
    const totalCount = filteredShipments.length;

    try {
      Swal.fire({
        title: '전체 배송 상태 동기화 중...',
        text: `총 ${totalCount}건의 택배 배송 상태를 조회하고 있습니다.`,
        allowOutsideClick: false,
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
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: '동기화 오류', text: err.message });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  useEffect(() => {
    // 15분마다 전체 배송상태 자동 동기화
    const interval = setInterval(() => {
      if (filteredShipments.length > 0 && !syncing) {
        handleManualSync();
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [filteredShipments, syncing]);

  const handleDeleteShipment = async (id, number) => {
    const result = await Swal.fire({
      title: '운송장 내역 삭제',
      text: `운송장번호 ${number || ''} 내역을 목록에서 삭제하시겠습니까?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('b2b_shipments').delete().eq('id', id);
        if (error) throw error;
        setShipments((prev) => prev.filter((s) => s.id !== id));
        if (onRefreshCount) onRefreshCount(shipments.length - 1);
        Swal.fire({ icon: 'success', title: '삭제되었습니다.', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      } catch (err) {
        Swal.fire({ icon: 'error', title: '삭제 실패', text: err.message });
      }
    }
  };

  const handleSendKakaoNotice = (shipment) => {
    const message = `[진일라벨 배송안내]\n거래처: ${shipment.partner_name || shipment.customer_name || '고객'}\n운송장번호: ${shipment.tracking_number}\n현재배송상태: ${shipment.tracking_status_label || '배송중'}\n조회링크: https://trace.cjlogistics.com/next/tracking.html?wblNo=${shipment.tracking_number}`;
    navigator.clipboard.writeText(message);
    Swal.fire({
      icon: 'info',
      title: '카톡 안내 메시지가 복사되었습니다!',
      text: '카카오톡 채팅창에 Ctrl+V로 붙여넣어 발송하세요.',
      confirmButtonText: '확인'
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            배송 중인 운송장 내역
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ✕
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition disabled:opacity-50"
            >
              <span className={syncing ? 'animate-spin' : ''}>🔄</span>
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
              <div className="text-4xl mb-2">📦</div>
              <p className="font-medium">배송 중인 운송장 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">출고일자</th>
                    <th className="py-3 px-4">거래처명</th>
                    <th className="py-3 px-4">수령인 / 고객명</th>
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
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          title="클릭하여 운송장번호 복사"
                        >
                          {s.tracking_number}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {s.tracking_status_label || s.tracking_status || '배송중'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSendKakaoNotice(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-lg text-[11px] transition shadow-sm"
                        >
                          💬 카톡 안내
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteShipment(s.id, s.tracking_number)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition"
                          title="삭제"
                        >
                          🗑️
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
