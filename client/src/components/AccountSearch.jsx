import { useState, useRef, useEffect } from 'react';

function AccountSearch({ value, onChange, accounts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value && accounts) {
      const filtered = accounts.filter((acc) =>
        acc.account_id.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAccounts(filtered.slice(0, 10));
    } else {
      setFilteredAccounts([]);
    }
  }, [value, accounts]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelectAccount = (accountId) => {
    onChange(accountId);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search accounts..."
          className="input-field pl-10 pr-10"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-700 rounded transition-colors"
          >
            <svg
              className="w-4 h-4 text-dark-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {isOpen && filteredAccounts.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden"
        >
          <ul className="max-h-64 overflow-auto scrollbar-thin">
            {filteredAccounts.map((acc) => (
              <li
                key={acc.account_id}
                onClick={() => handleSelectAccount(acc.account_id)}
                className="px-4 py-3 hover:bg-dark-700 cursor-pointer transition-colors border-b border-dark-700 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-white">
                    {acc.account_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        acc.suspicion_score >= 80
                          ? 'bg-danger-500/20 text-danger-400'
                          : acc.suspicion_score >= 60
                          ? 'bg-warning-500/20 text-warning-400'
                          : 'bg-primary-500/20 text-primary-400'
                      }`}
                    >
                      {acc.suspicion_score}
                    </span>
                    {acc.ring_id && (
                      <span className="text-xs text-dark-400">{acc.ring_id}</span>
                    )}
                  </div>
                </div>
                {acc.detected_patterns && acc.detected_patterns.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {acc.detected_patterns.slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="text-xs text-dark-500 bg-dark-900 px-1.5 py-0.5 rounded"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AccountSearch;
