import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { RatingType } from '../lib/types';
import { Colors, RatingColors, RatingLabels } from '../lib/constants';

interface RatingButtonProps {
  rating: RatingType;
  onPress: () => void;
  selected?: boolean;
  size?: 'small' | 'normal' | 'large';
}

export function RatingButton({
  rating,
  onPress,
  selected = false,
  size = 'normal',
}: RatingButtonProps) {
  const color = RatingColors[rating];
  const label = RatingLabels[rating];

  const buttonSize = {
    small: { paddingHorizontal: 12, paddingVertical: 6 },
    normal: { paddingHorizontal: 16, paddingVertical: 10 },
    large: { paddingHorizontal: 20, paddingVertical: 14 },
  };

  const textSize = {
    small: 12,
    normal: 14,
    large: 16,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonSize[size],
        {
          backgroundColor: selected ? color : 'transparent',
          borderColor: color,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: textSize[size],
            color: selected ? Colors.background : color,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface RatingButtonGroupProps {
  onRate: (rating: RatingType) => void;
  selectedRating?: RatingType;
  size?: 'small' | 'normal' | 'large';
  layout?: 'row' | 'grid';
}

export function RatingButtonGroup({
  onRate,
  selectedRating,
  size = 'normal',
  layout = 'grid',
}: RatingButtonGroupProps) {
  const ratings: RatingType[] = ['amazing', 'good', 'meh', 'bad', 'not-interested'];

  return (
    <View style={[styles.group, layout === 'row' && styles.groupRow]}>
      {ratings.map((rating) => (
        <RatingButton
          key={rating}
          rating={rating}
          onPress={() => onRate(rating)}
          selected={selectedRating === rating}
          size={size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  groupRow: {
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  },
});

