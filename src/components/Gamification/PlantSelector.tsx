import React from 'react';

export interface PlantType {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  description: string;
}

export const AVAILABLE_PLANTS: PlantType[] = [
  { id: 'oak', name: 'Oak Tree', emoji: '🌳', rarity: 'common', description: 'Strong, steady growth. A symbol of wisdom.' },
  { id: 'bonsai', name: 'Zen Bonsai', emoji: '🪴', rarity: 'rare', description: 'Meticulous, calm focus. Radiates peace.' },
  { id: 'lavender', name: 'Lavender', emoji: '🪻', rarity: 'rare', description: 'Calming lavender fields to ease study tension.' },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', rarity: 'epic', description: 'Bright, cheerful focus that follows light.' },
  { id: 'lotus', name: 'Mystic Lotus', emoji: '🪷', rarity: 'legendary', description: 'Grows in muddy waters. Absolute clarity.' },
  { id: 'sword', name: 'Sword', emoji: '⚔️', rarity: 'mythic', description: 'NO ESCAPE. Once planted, you cannot break the lock. Total commitment.' },
];

interface PlantSelectorProps {
  selectedPlantId: string;
  onSelectPlant: (id: string) => void;
  disabled?: boolean;
}

const PlantSelector: React.FC<PlantSelectorProps> = ({ selectedPlantId, onSelectPlant, disabled }) => {
  return (
    <div className="flex-col gap-xs" style={{ width: '100%' }}>
      <span className="setting-desc">Select Seed to Plant:</span>
      <div className="plant-selector-grid">
        {AVAILABLE_PLANTS.map((plant) => (
          <button
            key={plant.id}
            type="button"
            className={`plant-option-card flex-center gap-sm ${selectedPlantId === plant.id ? 'active' : ''}`}
            onClick={() => !disabled && onSelectPlant(plant.id)}
            disabled={disabled}
            title={plant.description}
          >
            <span className="plant-emoji">{plant.emoji}</span>
            <div className="plant-info flex-col">
              <span className="plant-name">{plant.name}</span>
              <span className={`plant-rarity rarity-${plant.rarity}`}>{plant.rarity}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlantSelector;
