import { useState, useRef, useEffect } from 'react';
import { generateRingColor } from '../utils/graphUtils';

function RingFilter({ rings, selectedRing, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedRingData = selectedRing
    ? rings?.find((r) => r.ring_id === selectedRing)
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-left flex items-center justify-between transition-colors hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
      >
        <div className="flex items-center gap-2">
          {selectedRingData ? (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: generateRingColor(selectedRingData.ring_id),
                }}
              />
              <span className="text-white">{selectedRingData.ring_id}</span>
              <span className="text-xs text-dark-400">
                ({selectedRingData.member_accounts.length} members)
              </span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5 text-dark-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="text-dark-400">Filter by Ring</span>
            </>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-dark-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden">
          <ul className="max-h-64 overflow-auto scrollbar-thin">
            <li
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`px-4 py-3 hover:bg-dark-700 cursor-pointer transition-colors border-b border-dark-700 ${
                !selectedRing ? 'bg-dark-700/50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-dark-500"></div>
                <span className="text-dark-300">All Rings</span>
              </div>
            </li>

            {rings?.map((ring) => (
              <li
                key={ring.ring_id}
                onClick={() => {
                  onSelect(ring.ring_id);
                  setIsOpen(false);
                }}
                className={`px-4 py-3 hover:bg-dark-700 cursor-pointer transition-colors border-b border-dark-700 last:border-0 ${
                  selectedRing === ring.ring_id ? 'bg-dark-700/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: generateRingColor(ring.ring_id) }}
                    />
                    <span className="text-white">{ring.ring_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        ring.risk_score >= 80
                          ? 'bg-danger-500/20 text-danger-400'
                          : ring.risk_score >= 60
                          ? 'bg-warning-500/20 text-warning-400'
                          : 'bg-primary-500/20 text-primary-400'
                      }`}
                    >
                      {ring.risk_score}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-dark-500">
                  <span>{ring.member_accounts.length} members</span>
                  <span>•</span>
                  <span className="capitalize">
                    {ring.pattern_type.replace('_', ' ')}
                  </span>
                </div>
              </li>
            ))}

            {(!rings || rings.length === 0) && (
              <li className="px-4 py-6 text-center text-dark-500">
                No fraud rings detected
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RingFilter;
