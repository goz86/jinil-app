/**
 * Rules for normalizing and recognizing destinations (출고처 / B2B Destinations)
 * Synchronized with B2B Web App (C:\Users\junwi\Desktop\web app\B2B\jinil-landing-page).
 * Prevents mistaken identification between partners on the same street (e.g. 비터셀즈 & sketch on 다산로).
 */

export const KNOWN_DESTINATIONS = [
  {
    id: 'bittercells',
    name: '비터셀즈',
    keywords: ['비터셀즈', 'bittercells', '비터셀'],
    phonePatterns: ['01063340512', '010-6334-0512', '63340512', '6334-0512'],
    canonicalName: '비터셀즈',
    canonicalAddress: '서울 중구 신당동 292-45 8층',
    canonicalPhone: '010-6334-0512',
    addressKeywords: ['신당동 292-45', '신당동292-45', '292-45', '292-45 8층', '신당동 292'],
  },
  {
    id: 'sketch',
    name: 'sketch',
    keywords: ['sketch', '스케치'],
    phonePatterns: ['01024632100', '010-2463-2100', '24632100', '2463-2100'],
    canonicalName: 'sketch',
    canonicalAddress: '서울 중구 다산로33길62 지층',
    canonicalPhone: '010-2463-2100',
    addressKeywords: ['다산로33길62', '다산로33길 62', '다산로33길', '33길62', '33길 62'],
  },
];

export function cleanText(val) {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function cleanPhone(val) {
  return String(val ?? '').replace(/\D/g, '');
}

export function extractAddressNumbers(addr) {
  if (!addr) return [];
  return String(addr).match(/\d+([~-]\d+)?/g) ?? [];
}

export function hasHouseNumber(addr) {
  if (!addr) return false;
  return extractAddressNumbers(addr).length > 0;
}

export function findKnownDestination({ name, address, phone }) {
  const normName = cleanText(name);
  const normPhone = cleanPhone(phone);
  const normAddr = cleanText(address);

  for (const rule of KNOWN_DESTINATIONS) {
    if (rule.keywords.some((kw) => normName.includes(cleanText(kw)))) {
      return rule;
    }
  }

  if (normPhone && normPhone.length >= 7) {
    for (const rule of KNOWN_DESTINATIONS) {
      if (rule.phonePatterns.some((p) => normPhone.includes(cleanPhone(p)) || cleanPhone(p).includes(normPhone))) {
        return rule;
      }
    }
  }

  if (hasHouseNumber(address)) {
    for (const rule of KNOWN_DESTINATIONS) {
      if (rule.addressKeywords.some((ak) => normAddr.includes(cleanText(ak)))) {
        return rule;
      }
    }
  }

  return null;
}

export function isSafeAddressMatch(addr1, addr2) {
  if (!addr1 || !addr2) return false;
  const c1 = cleanText(addr1);
  const c2 = cleanText(addr2);
  if (!c1 || !c2) return false;

  const nums1 = extractAddressNumbers(addr1);
  const nums2 = extractAddressNumbers(addr2);

  if (nums1.length === 0 || nums2.length === 0) {
    return false;
  }

  if (c1 === c2) return true;

  const hasCommonNumber = nums1.some((n1) => nums2.includes(n1));
  if (!hasCommonNumber) {
    return false;
  }

  return c1.includes(c2) || c2.includes(c1);
}

/**
 * Resolves accurate shipment display information (prevents false positive sketch for bittercells)
 */
export function resolveShipmentDisplay(shipment) {
  if (!shipment) {
    return { displayName: '-', displayAddress: '-', displayCompany: null };
  }

  const rawRecipient = shipment.recipient_name || '';
  const rawLocation = shipment.location_name || '';
  const rawCompany = shipment.company_name || '';
  const rawAddress = shipment.recipient_address || '';

  const isBittercells =
    /비터셀즈|bittercells/i.test(rawRecipient) ||
    /비터셀즈|bittercells/i.test(rawLocation) ||
    /비터셀즈|bittercells/i.test(rawCompany);

  const isSketch =
    !isBittercells &&
    (/sketch|스케치/i.test(rawRecipient) ||
      /sketch|스케치/i.test(rawLocation) ||
      /sketch|스케치/i.test(rawCompany));

  if (isBittercells) {
    const displayName =
      rawRecipient && !/sketch|스케치/i.test(rawRecipient)
        ? rawRecipient
        : '비터셀즈';
    const displayAddress =
      !rawAddress ||
      !hasHouseNumber(rawAddress) ||
      cleanText(rawAddress).includes('다산로') ||
      !rawAddress.includes('292-45')
        ? '서울 중구 신당동 292-45 8층'
        : rawAddress;
    const displayCompany = rawCompany && rawCompany !== '미지정' ? rawCompany : '비터셀즈';
    return {
      displayName,
      displayAddress,
      displayCompany,
    };
  }

  if (isSketch) {
    const displayName = 'sketch';
    const displayAddress =
      !rawAddress ||
      !hasHouseNumber(rawAddress) ||
      !rawAddress.includes('62')
        ? '서울 중구 다산로33길62 지층'
        : rawAddress;
    const displayCompany = rawCompany && rawCompany !== '미지정' ? rawCompany : 'sketch';
    return {
      displayName,
      displayAddress,
      displayCompany,
    };
  }

  return {
    displayName: shipment.location_name || shipment.recipient_name || shipment.company_name || '-',
    displayAddress: shipment.recipient_address || '-',
    displayCompany: shipment.company_name || null,
  };
}
