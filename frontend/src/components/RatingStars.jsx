import React from 'react';
import { Star } from 'lucide-react';

export default function RatingStars({ rating = 0, onChange, readOnly = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange && onChange(star)}
          style={{
            background: 'none',
            border: 'none',
            cursor: readOnly ? 'default' : 'pointer',
            padding: '2px',
            color: star <= rating ? '#fbbf24' : '#4b5563',
            transition: 'transform 0.15s ease'
          }}
        >
          <Star 
            size={22} 
            fill={star <= rating ? '#fbbf24' : 'none'} 
          />
        </button>
      ))}
    </div>
  );
}
