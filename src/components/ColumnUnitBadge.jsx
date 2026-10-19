import React, { useState, useEffect } from 'react';

/**
 * ColumnUnitBadge
 * Compact, editable unit / affix pill for table column headers.
 * Allows toggling on/off, editing the unit text (e.g. ₩, NO., 수량, 개, 장, mm...),
 * and toggling between Prefix (앞) and Suffix (뒤).
 */
export default function ColumnUnitBadge({
    colKey,
    config = { enabled: false, text: '', pos: 'prefix' },
    onChange
}) {
    const { enabled = false, text = '', pos = 'prefix' } = config;
    const [isEditing, setIsEditing] = useState(false);
    const [tempText, setTempText] = useState(text || '');

    useEffect(() => {
        setTempText(text || '');
    }, [text]);

    const handleCommitText = () => {
        setIsEditing(false);
        const trimmed = tempText.trim();
        onChange({ enabled, text: trimmed, pos });
    };

    const togglePosition = (e) => {
        e.stopPropagation();
        const nextPos = pos === 'prefix' ? 'suffix' : 'prefix';
        onChange({ enabled, text, pos: nextPos });
    };

    const toggleEnabled = (e) => {
        e.stopPropagation();
        onChange({ enabled: e.target.checked, text, pos });
    };

    const defaultPlaceholder = colKey === 'price' ? '₩' : colKey === 'extra1' ? 'NO.' : colKey === 'extra2' ? '수량' : colKey === 'productName' ? '개' : '단위';

    return (
        <div
            className={`inline-flex items-center gap-1 ml-auto px-1.5 py-0.5 rounded-md border text-[10px] transition-all select-none ${
                enabled
                    ? 'bg-blue-50/80 border-blue-300 text-blue-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
            }`}
            title={`단위 설정: ${pos === 'prefix' ? '앞에 붙임 (Prefix)' : '뒤에 붙임 (Suffix)'} (클릭하여 수정)`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Checkbox */}
            <input
                type="checkbox"
                checked={enabled}
                onChange={toggleEnabled}
                className="w-3 h-3 rounded accent-blue-600 cursor-pointer"
                title={enabled ? '단위 표시 켜짐' : '단위 표시 꺼짐'}
            />

            {/* Editable text */}
            {isEditing ? (
                <input
                    type="text"
                    value={tempText}
                    autoFocus
                    onChange={(e) => setTempText(e.target.value)}
                    onBlur={handleCommitText}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitText();
                        if (e.key === 'Escape') {
                            setTempText(text);
                            setIsEditing(false);
                        }
                    }}
                    className="w-10 text-[10px] font-bold text-center bg-white border border-blue-400 rounded outline-none text-slate-800 px-0.5"
                    placeholder={defaultPlaceholder}
                />
            ) : (
                <span
                    onClick={() => setIsEditing(true)}
                    className="font-bold cursor-text hover:text-blue-600 px-0.5 min-w-[14px] text-center"
                    title="클릭하여 단위 변경 (예: ₩, NO., 수량, 개, 장, 원, mm)"
                >
                    {text || defaultPlaceholder}
                </span>
            )}

            {/* Position Switcher: 앞(Prefix) vs 뒤(Suffix) */}
            <button
                type="button"
                onClick={togglePosition}
                className={`text-[8.5px] font-black px-1 py-0.2 rounded transition-all cursor-pointer ${
                    pos === 'prefix'
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
                title={pos === 'prefix' ? '현재: 앞에 붙임 (클릭시 뒤로 변경)' : '현재: 뒤에 붙임 (클릭시 앞으로 변경)'}
            >
                {pos === 'prefix' ? '앞' : '뒤'}
            </button>
        </div>
    );
}
