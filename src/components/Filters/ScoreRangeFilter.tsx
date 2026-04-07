import { useState } from 'react';
import { Flame, Snowflake } from 'lucide-react';

interface ScoreRangeFilterProps {
  scoreMin: number;
  scoreMax: number;
  onScoreRangeChange: (min: number, max: number) => void;
}

export function ScoreRangeFilter({ scoreMin, scoreMax, onScoreRangeChange }: ScoreRangeFilterProps) {
  const [localMin, setLocalMin] = useState(scoreMin);
  const [localMax, setLocalMax] = useState(scoreMax);

  const handleMinChange = (value: string) => {
    const num = parseInt(value) || 0;
    setLocalMin(Math.max(0, Math.min(num, 100)));
  };

  const handleMaxChange = (value: string) => {
    const num = parseInt(value) || 100;
    setLocalMax(Math.max(0, Math.min(num, 100)));
  };

  const applyRange = () => {
    if (localMin <= localMax) {
      onScoreRangeChange(localMin, localMax);
    }
  };

  const handleQuickButton = (min: number, max: number) => {
    setLocalMin(min);
    setLocalMax(max);
    onScoreRangeChange(min, max);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-700 block">Rango de Score</label>

      {/* Quick buttons */}
      <div className="space-y-2">
        <button
          onClick={() => handleQuickButton(80, 100)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors border-2 ${
            scoreMin === 80 && scoreMax === 100
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Flame size={14} className="inline mr-1" /> Calientes (80+)
        </button>

        <button
          onClick={() => handleQuickButton(60, 80)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors border-2 ${
            scoreMin === 60 && scoreMax === 80
              ? 'bg-primary-50 border-primary-300 text-primary-700'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          Templados (60-80)
        </button>

        <button
          onClick={() => handleQuickButton(0, 40)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors border-2 ${
            scoreMin === 0 && scoreMax === 40
              ? 'bg-gray-300 border-gray-400 text-gray-700'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Snowflake size={14} className="inline mr-1" /> Fríos (&lt;40)
        </button>
      </div>

      {/* Manual range inputs */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-600 block mb-1">Mínimo</label>
            <input
              type="number"
              min="0"
              max="100"
              value={localMin}
              onChange={(e) => handleMinChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-600 block mb-1">Máximo</label>
            <input
              type="number"
              min="0"
              max="100"
              value={localMax}
              onChange={(e) => handleMaxChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="100"
            />
          </div>
        </div>

        <button
          onClick={applyRange}
          className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          Aplicar Rango
        </button>
      </div>

      {/* Visual slider representation */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
        <div className="w-full h-1 bg-gray-200 rounded-full relative">
          <div
            className="h-full bg-gradient-to-r from-gray-400 via-blue-500 to-emerald-500 rounded-full"
            style={{
              left: `${(scoreMin / 100) * 100}%`,
              right: `${100 - (scoreMax / 100) * 100}%`,
              position: 'absolute'
            }}
          />
        </div>
      </div>
    </div>
  );
}
