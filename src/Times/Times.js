import React from 'react';
import PropTypes from 'prop-types';
import { View, Text } from 'react-native';
import styles from './Times.styles';
import { getTimeLabelHeight, intervalIndexToTimeString } from '../utils';

const Times = ({ times, hoursInDisplay, timeStep, textStyle, interval, minHour, maxHour }) => {
  const height = getTimeLabelHeight(hoursInDisplay, timeStep);
  return (
    <View style={styles.columnContainer}>
      {times.map((time, index) => (
        <View key={time} style={[styles.label, { height }]}>
          <Text style={[styles.text, textStyle, { position: 'absolute' }]}>{time}</Text>
          {
            !!interval.start &&
            interval.start > (index + minHour) * 4 &&
            interval.start < (index + 1 + minHour) * 4 &&
            <Text style={[styles.text, textStyle, { position: 'absolute' }, { marginTop: (interval.start % 4) * height / 4 }]}>
              {intervalIndexToTimeString(interval.start)}
            </Text>
          }
          {
            !!interval.end &&
            interval.end > (index + minHour) * 4 &&
            interval.end < (index + 1 + minHour) * 4 &&
            <Text style={[styles.text, textStyle, { position: 'absolute' }, { marginTop: ((interval.end % 4) * height / 4) }]}>
              {intervalIndexToTimeString(interval.end)}
            </Text>
          }
        </View>
      ))
      }
    </View >
  );
};

Times.propTypes = {
  times: PropTypes.arrayOf(PropTypes.string).isRequired,
  hoursInDisplay: PropTypes.number.isRequired,
  timeStep: PropTypes.number.isRequired,
  textStyle: Text.propTypes.style,
  minHour: PropTypes.number,
  maxHour: PropTypes.number,
};

export default React.memo(Times);
