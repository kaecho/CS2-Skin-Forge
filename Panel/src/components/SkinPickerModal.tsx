import { useState, useMemo, useCallback } from 'react';

interface SkinPickerItem {
  id: number;
  name: string;
  image?: string;
}

interface SkinPickerModalProps {
  title: string;
  items: SkinPickerItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
  renderItem?: (item: SkinPickerItem, isSelected: boolean) => React.ReactNode;
}

export default function SkinPickerModal({
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  renderItem,
}: SkinPickerModalProps) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(200);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  const handleSelect = useCallback(
    (id: number) => {
      onSelect(id);
    },
    [onSelect]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-4xl max-h-[85vh] flex flex-col !p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-base font-bold text-white truncate">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="mb-3 shrink-0">
          <input
            type="text"
            placeholder="Search skins..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(200);
            }}
            className="input-field w-full !text-sm"
            autoFocus
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {visible.map((item) => {
              const isSelected = item.id === selectedId;
              if (renderItem) {
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className="contents"
                  >
                    {renderItem(item, isSelected)}
                  </button>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex flex-col items-center p-2.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
                    isSelected
                      ? 'bg-amber-500/[0.15] text-amber-200 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                      : 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] border-white/[0.05] hover:border-white/[0.1]'
                  }`}
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-16 object-contain mb-1.5 rounded"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="truncate w-full text-center leading-tight">
                    {item.name}
                  </span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="col-span-full text-center text-sm text-gray-600 py-8">
                No skins found
              </div>
            )}
          </div>
        </div>

        {/* Load more */}
        {filtered.length > limit && (
          <div className="mt-3 shrink-0">
            <button
              onClick={() => setLimit((prev) => prev + 200)}
              className="w-full py-2 text-sm text-gray-300 bg-white/[0.05] hover:bg-white/10 rounded-lg border border-white/[0.06] transition-colors"
            >
              Load More ({visible.length} / {filtered.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
