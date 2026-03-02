import React from 'react';
import type { Property } from '../types/game';
import { calculateRent } from '../logic/rules/rent';
import { useGameStore } from '../store/gameStore';

interface PropertyTooltipProps {
  property: Property;
}

export const PropertyTooltip: React.FC<PropertyTooltipProps> = ({ property }) => {
  const players = useGameStore(s => s.players);
  const diceRoll = useGameStore(s => s.diceRoll);
  const owner = property.owner !== undefined ? players[property.owner] : null;
  const rent = calculateRent(useGameStore.getState(), property, diceRoll?.total ?? 7);

  return (
    <div style={{
      position: 'absolute',
      bottom: '105%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <div><strong>{property.name}</strong></div>
      {owner ? (
        <div>Owner: {owner.name}</div>
      ) : (
        <div>Unowned</div>
      )}
      <div>Rent: £{rent}</div>
      {property.mortgaged && <div style={{ color: '#ff6b6b' }}>Mortgaged</div>}
    </div>
  );
};